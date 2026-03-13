import { NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { unichainSepolia } from 'viem/chains';
import ArenaHookABI from '@/abis/ArenaHook.json';
import { P2P_TRADING_ARENA_ADDRESSES } from '@/config/contracts';

const client = createPublicClient({
    chain: unichainSepolia,
    transport: http('https://unichain-sepolia-rpc.publicnode.com'),
});

export async function GET() {
    try {
        const hookAddress = P2P_TRADING_ARENA_ADDRESSES.ArenaHook as `0x${string}`;
        const abi = (ArenaHookABI as any).abi || ArenaHookABI;

        // Get total number of orders
        const nextOrderId = await client.readContract({
            address: hookAddress,
            abi,
            functionName: 'nextOrderId',
        }) as bigint;

        const count = Number(nextOrderId);
        if (count === 0) {
            return NextResponse.json({ orders: [] });
        }

        // Fetch active orders (limit to last 20 for performance)
        const limit = 20;
        const startIndex = Math.max(0, count - limit);
        const orderIds = Array.from({ length: count - startIndex }, (_, i) => BigInt(startIndex + i));

        // Use multicall for efficiency
        const results = await client.multicall({
            contracts: orderIds.map(id => ({
                address: hookAddress,
                abi,
                functionName: 'orders',
                args: [id],
            })),
        });

        const orders = results
            .map((result, index) => {
                if (result.status === 'failure' || !result.result) return null;
                
                const orderData = result.result as any;
                const id = orderIds[index];

                // New struct layout:
                // 0: maker, 1: expiry, 2: sellToken0, 3: active, 4: isHuman, 5: amountIn, 6: minAmountOut
                const active = orderData[3];
                if (!active) return null;

                const maker = orderData[0];
                const expiryRaw = orderData[1];
                const sellToken0 = orderData[2];
                const isHuman = orderData[4];
                const amountIn = orderData[5].toString();
                const minAmountOut = orderData[6].toString();
                
                const expiry = new Date(Number(expiryRaw) * 1000).toISOString();
                
                return {
                    orderId: Number(id),
                    maker,
                    sellToken0,
                    amountIn,
                    minAmountOut,
                    expiry,
                    active: true,
                    isHuman,
                    isExpired: Number(expiryRaw) < Math.floor(Date.now() / 1000),
                    sellToken: sellToken0 ? 'TKNA' : 'TKNB',
                    buyToken: sellToken0 ? 'TKNB' : 'TKNA',
                };
            })
            .filter((o): o is NonNullable<typeof o> => o !== null)
            .reverse();

        return NextResponse.json({ orders });
    } catch (error: any) {
        console.error('Failed to fetch orders:', error);
        // Fallback to empty list instead of 500 to keep UI stable
        return NextResponse.json({ 
            orders: [], 
            error: error.message || 'Failed to fetch orders' 
        });
    }
}
