import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
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
        const nextOrderIdRaw = await client.readContract({
            address: hookAddress,
            abi: (ArenaHookABI as any).abi || ArenaHookABI,
            functionName: 'nextOrderId',
        }) as bigint;

        const count = Number(nextOrderIdRaw);
        const deals = [];

        // Fetch last 10 orders to show as deals
        const startIndex = Math.max(0, count - 10);

        for (let i = startIndex; i < count; i++) {
            const orderData = await client.readContract({
                address: hookAddress,
                abi: (ArenaHookABI as any).abi || ArenaHookABI,
                functionName: 'orders',
                args: [BigInt(i)],
            }) as any;

            // orderData: [maker, sellToken0, amountIn, minAmountOut, expiry, active, filled, fillAmount]
            deals.push({
                id: i.toString(),
                regime: 'p2p',
                fromToken: orderData[1] ? 'TKNA' : 'TKNB',
                toToken: orderData[1] ? 'TKNB' : 'TKNA',
                fromAmount: orderData[2].toString(),
                toAmount: orderData[3].toString(),
                fromTokenDecimals: 18,
                toTokenDecimals: 18,
                botAddress: orderData[0],
                status: !orderData[5] ? 'completed' : 'active',
                createdAt: new Date(Number(orderData[4]) * 1000 - 3600 * 1000).toISOString(),
            });
        }

        return NextResponse.json({ deals: deals.reverse() });
    } catch (error) {
        console.error('Failed to fetch deals:', error);
        return NextResponse.json({ deals: [], error: 'Failed' }, { status: 500 });
    }
}
