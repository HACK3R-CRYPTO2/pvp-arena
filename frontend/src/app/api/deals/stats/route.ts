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

        // For demo purposes, we'll calculate some plausible stats based on order count
        return NextResponse.json({
            stats: {
                totalTrades: count,
                tradesPerHour: count / 24, // Assumes repo has been active for a day
                lifiSwaps: 0,
                totalVolume: count * 100, // Dummy volume calc
                totalPnl: count * 10, // Dummy PnL calc
            }
        });
    } catch (error) {
        console.error('Failed to fetch stats:', error);
        return NextResponse.json({ stats: null, error: 'Failed' }, { status: 500 });
    }
}
