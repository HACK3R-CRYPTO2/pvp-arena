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

        const orders = [];
        const count = Number(nextOrderId);

        // Fetch active orders (limit to last 20 for performance)
        const startIndex = Math.max(0, count - 20);

        for (let i = startIndex; i < count; i++) {
            const orderData = await client.readContract({
                address: hookAddress,
                abi: (ArenaHookABI as any).abi || ArenaHookABI,
                functionName: 'orders',
                args: [BigInt(i)],
            }) as any;

            // viem returns an object if names are in ABI, or an array otherwise
            // struct Order { address maker; bool sellToken0; uint128 amountIn; uint128 minAmountOut; uint256 expiry; bool active; ... }
            const active = typeof orderData.active !== 'undefined' ? orderData.active : orderData[5];

            if (active) {
                const maker = orderData.maker || orderData[0];
                const sellToken0 = typeof orderData.sellToken0 !== 'undefined' ? orderData.sellToken0 : orderData[1];
                const amountIn = (orderData.amountIn || orderData[2]).toString();
                const minAmountOut = (orderData.minAmountOut || orderData[3]).toString();
                const expiry = new Date(Number(orderData.expiry || orderData[4]) * 1000).toISOString();
                
                // Use currency addresses from the order struct to determine TKA/TKB
                const currency0 = orderData.currency0 || orderData[8];
                const currency1 = orderData.currency1 || orderData[9];

                orders.push({
                    orderId: i,
                    maker,
                    sellToken0,
                    amountIn,
                    minAmountOut,
                    expiry,
                    active,
                    isExpired: Number(orderData.expiry || orderData[4]) < Math.floor(Date.now() / 1000),
                    sellToken: sellToken0 ? 'TKNA' : 'TKNB',
                    buyToken: sellToken0 ? 'TKNB' : 'TKNA',
                });
            }
        }

        return NextResponse.json({ orders: orders.reverse() });
    } catch (error) {
        console.error('Failed to fetch orders:', error);
        return NextResponse.json({ orders: [], error: 'Failed to fetch orders' }, { status: 500 });
    }
}
