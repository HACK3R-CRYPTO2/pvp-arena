import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { unichainSepolia } from 'viem/chains';
import ArenaHookABI from '@/abis/ArenaHook.json';
import { P2P_TRADING_ARENA_ADDRESSES } from '@/config/contracts';

const client = createPublicClient({
    chain: unichainSepolia,
    transport: http('https://unichain-sepolia-rpc.publicnode.com'),
});

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const filterAddress = searchParams.get('botAddress')?.toLowerCase();

        const hookAddress = P2P_TRADING_ARENA_ADDRESSES.ArenaHook as `0x${string}`;

        // Fetch live price from backend status
        const [statusRes, nextOrderIdRaw] = await Promise.all([
            fetch('http://localhost:3001/status').then(r => r.json()).catch(() => ({ ethPrice: 3000 })),
            client.readContract({
                address: hookAddress,
                abi: (ArenaHookABI as any).abi || ArenaHookABI,
                functionName: 'nextOrderId',
            }) as Promise<bigint>
        ]);

        const LIVE_PRICE = statusRes.ethPrice || 3000;

        const count = Number(nextOrderIdRaw);
        
        // Pre-fetch OrderFilled events to find real winners
        const latestBlock = await client.getBlockNumber();
        const fromBlock = latestBlock > BigInt(45000) ? latestBlock - BigInt(45000) : BigInt(0);

        const fillLogs = await client.getLogs({
            address: hookAddress,
            event: parseAbiItem('event OrderFilled(uint256 indexed orderId, address indexed taker, bool byReactiveAi)'),
            fromBlock: fromBlock
        });

        const winnersMap: Record<number, { taker: string, byAi: boolean }> = {};
        fillLogs.forEach(log => {
            if (log.args.orderId !== undefined) {
                winnersMap[Number(log.args.orderId)] = {
                    taker: (log.args.taker as string).toLowerCase(),
                    byAi: !!log.args.byReactiveAi
                };
            }
        });

        // Fetch last 15 orders to calculate stats
        const startIndex = Math.max(0, count - 15);
        let botTrades = 0;
        let botVolume = 0;
        let globalVolume = 0;
        let botPnl = 0;
        let globalPnl = 0;

        // Helper for block-deterministic simulation (must match StrategyService.ts)
        const getSimulatedPrice = (blockNumber: number) => {
            const baseline = 3000;
            const amplitude = 50;
            const period = 100;
            const oscillation = Math.sin(blockNumber / period) * amplitude;
            return parseFloat((baseline + oscillation).toFixed(2));
        };

        for (let i = startIndex; i < count; i++) {
            try {
                const orderData = await client.readContract({
                    address: hookAddress,
                    abi: (ArenaHookABI as any).abi || ArenaHookABI,
                    functionName: 'orders',
                    args: [BigInt(i)],
                }) as any;

                const makerAddress = orderData[0].toLowerCase();
                const sellToken0 = orderData[2]; // sellToken0
                const active = orderData[3]; // active
                const fromAmount = Number(orderData[5]) / 1e18;
                const toAmount = Number(orderData[6]) / 1e18;
                const isCompleted = !active;

                const winnerInfo = winnersMap[i];
                const takerAddress = winnerInfo?.taker || null;

                const isBotInvolved = !filterAddress || 
                                     makerAddress === filterAddress || 
                                     takerAddress === filterAddress;

                const tradeVolumeUsd = fromAmount * (sellToken0 ? LIVE_PRICE : 1);
                globalVolume += tradeVolumeUsd;

                if (!isBotInvolved) continue;

                botTrades++;
                botVolume += tradeVolumeUsd;

                if (isCompleted) {
                    const isWinner = takerAddress === filterAddress;
                    
                    // Use block of execution for finalized profit (Frozen History)
                    const fillLog = fillLogs.find(l => Number(l.args.orderId) === i);
                    const executionPrice = fillLog?.blockNumber 
                        ? getSimulatedPrice(Number(fillLog.blockNumber))
                        : LIVE_PRICE;

                    if (sellToken0) {
                        // Maker sell TKNA (Asset). Sniper gets Asset.
                        const capture = (fromAmount * executionPrice) - toAmount;
                        botPnl += isWinner ? capture : -capture;
                        globalPnl += capture;
                    } else {
                        // Maker sell TKNB (Stable). Sniper gets Stable.
                        const capture = fromAmount - (toAmount * executionPrice);
                        botPnl += isWinner ? capture : -capture;
                        globalPnl += capture;
                    }
                }
            } catch (e) {}
        }

        const aiFills = fillLogs.filter(log => !!log.args.byReactiveAi).length;

        return NextResponse.json({
            stats: {
                totalTrades: count,
                tradesPerHour: (count / 1.5), 
                reactiveExecs: aiFills,
                totalVolume: globalVolume,
                totalPnl: globalPnl,
            }
        });
    } catch (error) {
        console.error('Failed to fetch stats:', error);
        return NextResponse.json({ stats: null, error: 'Failed' }, { status: 500 });
    }
}
