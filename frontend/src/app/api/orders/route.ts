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

            // struct Order { address maker; bool sellToken0; uint128 amountIn; uint128 minAmountOut; uint256 expiry; bool active; ... }
            if (orderData[5]) { // active
                orders.push({
                    orderId: i,
                    maker: orderData[0],
                    sellToken0: orderData[1],
                    amountIn: orderData[2].toString(),
                    minAmountOut: orderData[3].toString(),
                    expiry: new Date(Number(orderData[4]) * 1000).toISOString(),
                    active: orderData[5],
                    isExpired: Number(orderData[4]) < Math.floor(Date.now() / 1000),
                    sellToken: orderData[1] ? 'TOKEN0' : 'TOKEN1', // Placeholder names
                    buyToken: orderData[1] ? 'TOKEN1' : 'TOKEN0',
                });
            }
        }

        return NextResponse.json({ orders: orders.reverse() });
    } catch (error) {
        console.error('Failed to fetch orders:', error);
        return NextResponse.json({ orders: [], error: 'Failed to fetch orders' }, { status: 500 });
    }
}
