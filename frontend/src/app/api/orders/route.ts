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

        // Get total number of orders
        const nextOrderId = await client.readContract({
            address: hookAddress,
            abi: (ArenaHookABI as any).abi || ArenaHookABI,
            functionName: 'nextOrderId',
        }) as bigint;

        const count = Number(nextOrderId);

        // Fetch active orders (limit to last 20 for performance)
        const startIndex = Math.max(0, count - 20);
        const orderIds = Array.from({ length: count - startIndex }, (_, i) => BigInt(startIndex + i));

        const orderPromises = orderIds.map(async (id) => {
            try {
                const orderData = await client.readContract({
                    address: hookAddress,
                    abi: (ArenaHookABI as any).abi || ArenaHookABI,
                    functionName: 'orders',
                    args: [id],
                }) as any;

                if (!orderData) return null;

                const active = typeof orderData.active !== 'undefined' ? orderData.active : orderData[5];
                if (!active) return null;

                const maker = orderData.maker || orderData[0];
                const sellToken0 = typeof orderData.sellToken0 !== 'undefined' ? orderData.sellToken0 : orderData[1];
                const amountIn = (orderData.amountIn || orderData[2]).toString();
                const minAmountOut = (orderData.minAmountOut || orderData[3]).toString();
                const expiryRaw = orderData.expiry || orderData[4];
                const expiry = new Date(Number(expiryRaw) * 1000).toISOString();
                
                return {
                    orderId: Number(id),
                    maker,
                    sellToken0,
                    amountIn,
                    minAmountOut,
                    expiry,
                    active: true,
                    isExpired: Number(expiryRaw) < Math.floor(Date.now() / 1000),
                    sellToken: sellToken0 ? 'TKNA' : 'TKNB',
                    buyToken: sellToken0 ? 'TKNB' : 'TKNA',
                };
            } catch (orderError) {
                console.error(`Skipping order #${id} due to fetch error:`, orderError);
                return null;
            }
        });

        const results = await Promise.all(orderPromises);
        const orders = results.filter((o): o is NonNullable<typeof o> => o !== null);

        return NextResponse.json({ orders: orders.reverse() });
    } catch (error: any) {
        console.error('Failed to fetch orders:', error);
        // Fallback to empty list instead of 500 to keep UI stable
        return NextResponse.json({ 
            orders: [], 
            error: error.message || 'Failed to fetch orders' 
        });
    }
}
