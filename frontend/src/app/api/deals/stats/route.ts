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

        // Get total number of orders
        const nextOrderIdRaw = await client.readContract({
            address: hookAddress,
            abi: (ArenaHookABI as any).abi || ArenaHookABI,
            functionName: 'nextOrderId',
        }) as bigint;

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

        for (let i = startIndex; i < count; i++) {
            try {
                const orderData = await client.readContract({
                    address: hookAddress,
                    abi: (ArenaHookABI as any).abi || ArenaHookABI,
                    functionName: 'orders',
                    args: [BigInt(i)],
                }) as any;

                const makerAddress = orderData[0].toLowerCase();
                const isTKNA = orderData[1];
                const fromAmount = Number(orderData[2]) / 1e18;
                const toAmount = Number(orderData[3]) / 1e18;
                const isCompleted = !orderData[5];

                const winnerInfo = winnersMap[i];
                const takerAddress = winnerInfo?.taker || null;

                const isBotInvolved = !filterAddress || 
                                     makerAddress === filterAddress || 
                                     takerAddress === filterAddress;

                const tradeVolumeUsd = fromAmount * (isTKNA ? 3000 : 1);
                globalVolume += tradeVolumeUsd;

                if (!isBotInvolved) continue;

                botTrades++;
                botVolume += tradeVolumeUsd;

                if (isCompleted) {
                    const priceSeed = 3000 + ( (i * 1337) % 100 ) - 50; 
                    const isWinner = takerAddress === filterAddress;
                    
                    if (isTKNA) {
                        // Maker sell TKNA (Asset). Sniper gets Asset.
                        const capture = (fromAmount * priceSeed) - toAmount;
                        botPnl += isWinner ? capture : -capture;
                        globalPnl += capture;
                    } else {
                        // Maker sell TKNB (Stable). Sniper gets Stable.
                        const capture = fromAmount - (toAmount * priceSeed);
                        botPnl += isWinner ? capture : -capture;
                        globalPnl += capture;
                    }
                }
            } catch (e) {}
        }

        return NextResponse.json({
            stats: {
                totalTrades: filterAddress ? botTrades : count,
                tradesPerHour: filterAddress ? botTrades : (count / 1.5), // Show activity over last 90 mins for demo
                reactiveExecs: filterAddress ? (botTrades > 2 ? 1 : 0) : Math.floor(count / 3),
                totalVolume: filterAddress ? botVolume : globalVolume,
                totalPnl: filterAddress ? botPnl : globalPnl,
            }
        });
    } catch (error) {
        console.error('Failed to fetch stats:', error);
        return NextResponse.json({ stats: null, error: 'Failed' }, { status: 500 });
    }
}
