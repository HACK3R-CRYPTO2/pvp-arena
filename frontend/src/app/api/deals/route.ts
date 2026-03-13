import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { unichainSepolia } from 'viem/chains';
import ArenaHookABI from '@/abis/ArenaHook.json';
import AgentRegistryABI from '@/abis/AgentRegistry.json';
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
        const registryAddress = P2P_TRADING_ARENA_ADDRESSES.AgentRegistry as `0x${string}`;
        const hookAbi = (ArenaHookABI as any).abi || ArenaHookABI;
        const registryAbi = (AgentRegistryABI as any).abi || AgentRegistryABI;

        // 1. Fetch live price from backend and contract data
        const rawUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
        const baseUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
        const [statusRes, alphaAddr, betaAddr, nextOrderIdRaw] = await Promise.all([
            fetch(`${baseUrl}/status`).then(r => r.json()).catch(() => ({ ethPrice: 3000 })),
            client.readContract({
                address: registryAddress,
                abi: registryAbi,
                functionName: 'getAgentWallet',
                args: [BigInt(1)],
            }).catch(() => '0xd2df53d9791e98db221842dd885f4144014bbe2a'),
            client.readContract({
                address: registryAddress,
                abi: registryAbi,
                functionName: 'getAgentWallet',
                args: [BigInt(2)],
            }).catch(() => '0x84a78a6f73ac2b74c457965f38f3afac9a34a6cc'),
            client.readContract({
                address: hookAddress,
                abi: hookAbi,
                functionName: 'nextOrderId',
            }) as Promise<bigint>
        ]);

        const LIVE_PRICE = statusRes.ethPrice || 3000;
        const ALPHA_ADDRESS = (alphaAddr as string).toLowerCase();
        const BETA_ADDRESS = (betaAddr as string).toLowerCase();
        const count = Number(nextOrderIdRaw);

        // 2. Fetch logs (parallelized)
        const latestBlock = await client.getBlockNumber();
        const fromBlock = latestBlock > BigInt(45000) ? latestBlock - BigInt(45000) : BigInt(0);

        const [fillLogs, cancelLogs, postedLogs] = await Promise.all([
            client.getLogs({
                address: hookAddress,
                event: parseAbiItem('event OrderFilled(uint256 indexed orderId, address indexed taker, bool byReactiveAi)'),
                fromBlock
            }),
            client.getLogs({
                address: hookAddress,
                event: parseAbiItem('event OrderCancelled(uint256 indexed orderId, address indexed maker)'),
                fromBlock
            }),
            client.getLogs({
                address: hookAddress,
                event: parseAbiItem('event OrderPosted(uint256 indexed orderId, address indexed maker, bool isHuman, uint128 amountIn, uint128 minAmountOut)'),
                fromBlock
            })
        ]);

        // 3. Map logs to lookups
        const winnersMap: Record<number, { taker: string, byAi: boolean }> = {};
        fillLogs.forEach(log => {
            if (log.args.orderId !== undefined) {
                winnersMap[Number(log.args.orderId)] = {
                    taker: (log.args.taker as string).toLowerCase(),
                    byAi: !!log.args.byReactiveAi
                };
            }
        });

        const cancelsMap: Record<number, boolean> = {};
        cancelLogs.forEach(log => {
            if (log.args.orderId !== undefined) {
                cancelsMap[Number(log.args.orderId)] = true;
            }
        });

        // 4. Optimization: Fetch block timestamps for posted orders (limited)
        const uniqueBlocks = [...new Set(postedLogs.map(l => l.blockNumber))].slice(-10);
        const blockTimestamps: Record<string, number> = {};
        await Promise.all(uniqueBlocks.map(async (b) => {
            if (b) {
                const block = await client.getBlock({ blockNumber: b }).catch(() => null);
                if (block) blockTimestamps[b.toString()] = Number(block.timestamp);
            }
        }));

        const postedTimeMap: Record<number, number> = {};
        postedLogs.forEach(log => {
            if (log.args.orderId !== undefined && log.blockNumber) {
                postedTimeMap[Number(log.args.orderId)] = blockTimestamps[log.blockNumber.toString()] || 0;
            }
        });

        // 5. Fetch order data in batches using multicall
        const startIndex = Math.max(0, count - 20); // Limit to last 20
        const orderIds = Array.from({ length: count - startIndex }, (_, i) => BigInt(startIndex + i));
        
        const orderResults = await client.multicall({
            contracts: orderIds.map(id => ({
                address: hookAddress,
                abi: hookAbi,
                functionName: 'orders',
                args: [id],
            })),
        });

        // Helper for block-deterministic simulation (must match StrategyService.ts)
        const getSimulatedPrice = (blockNumber: number) => {
            const baseline = 3000;
            const amplitude = 50;
            const period = 100;
            const oscillation = Math.sin(blockNumber / period) * amplitude;
            return parseFloat((baseline + oscillation).toFixed(2));
        };

        const deals = orderResults
            .map((res, index) => {
                if (res.status === 'failure' || !res.result) return null;
                const orderData = res.result as any;
                const id = Number(orderIds[index]);

                // Struct Mapping (New):
                // 0: maker, 1: expiry, 2: sellToken0, 3: active, 4: isHuman, 5: amountIn, 6: minAmountOut, 7: poolId, 8: currency0, 9: currency1
                const makerAddress = orderData[0].toLowerCase();
                const expiry = Number(orderData[1]);
                const isTKNA = orderData[2];
                const active = orderData[3];
                const isHumanMaker = !!orderData[4];
                const fromAmountRaw = orderData[5].toString();
                const toAmountRaw = orderData[6].toString();
                
                const fromAmount = Number(orderData[5]) / 1e18;
                const toAmount = Number(orderData[6]) / 1e18;

                const isCompleted = !active;
                const winnerInfo = winnersMap[id];
                const takerAddress = winnerInfo?.taker || null;

                // Mark-to-Market Profit Tracking
                let profit = null;
                if (isCompleted && !cancelsMap[id]) {
                    // PROTOCOL REFINEMENT: If completed, use the price at the block of execution (Frozen History)
                    // If block info is missing (old log), fall back to LIVE_PRICE or ID-seed
                    const fillLog = fillLogs.find(l => Number(l.args.orderId) === id);
                    const executionPrice = fillLog?.blockNumber 
                        ? getSimulatedPrice(Number(fillLog.blockNumber))
                        : LIVE_PRICE;

                    if (isTKNA) {
                        const marketValue = fromAmount * executionPrice;
                        profit = (marketValue - toAmount).toFixed(2);
                    } else {
                        const marketValueGiven = toAmount * executionPrice;
                        profit = (fromAmount - marketValueGiven).toFixed(2);
                    }
                } else if (active) {
                    // If still active, show live unrealized profit
                    if (isTKNA) {
                        profit = (fromAmount * LIVE_PRICE - (toAmount)).toFixed(2);
                    } else {
                        profit = (fromAmount - (toAmount * LIVE_PRICE)).toFixed(2);
                    }
                }

                let agentId = null;
                if (takerAddress === ALPHA_ADDRESS) agentId = 1;
                else if (takerAddress === BETA_ADDRESS) agentId = 2;
                else if (makerAddress === ALPHA_ADDRESS) agentId = 1;
                else if (makerAddress === BETA_ADDRESS) agentId = 2;

                const isInternalClash = isCompleted && 
                    (makerAddress === ALPHA_ADDRESS || makerAddress === BETA_ADDRESS) &&
                    (takerAddress === ALPHA_ADDRESS || takerAddress === BETA_ADDRESS);

                return {
                    id: id.toString(),
                    regime: 'p2p',
                    fromToken: isTKNA ? 'TKNA' : 'TKNB',
                    toToken: isTKNA ? 'TKNB' : 'TKNA',
                    fromAmount: fromAmountRaw,
                    toAmount: toAmountRaw,
                    fromTokenDecimals: 18,
                    toTokenDecimals: 18,
                    botAddress: takerAddress || (isCompleted ? null : makerAddress),
                    makerAddress: orderData[0],
                    takerAddress: takerAddress,
                    winnerIsAi: winnerInfo?.byAi || false,
                    isHumanMaker: isHumanMaker,
                    agentId: agentId,
                    isInternalClash: isInternalClash,
                    status: isCompleted 
                        ? (cancelsMap[id] ? 'cancelled' : 'completed') 
                        : (Date.now()/1000 > expiry ? 'expired' : 'active'),
                    profit,
                    createdAt: postedTimeMap[id] 
                        ? new Date(postedTimeMap[id] * 1000).toISOString() 
                        : new Date(Math.min(expiry * 1000 - 300 * 1000, Date.now())).toISOString(),
                    poolKey: {
                        currency0: orderData[8],
                        currency1: orderData[9],
                        fee: 3000,
                        tickSpacing: 60,
                        hooks: hookAddress
                    }
                };
            })
            .filter((d): d is NonNullable<typeof d> => d !== null);

        const filteredDeals = filterAddress 
            ? deals.filter(d => 
                d.makerAddress.toLowerCase() === filterAddress || 
                d.takerAddress?.toLowerCase() === filterAddress
              )
            : deals;

        return NextResponse.json({ deals: filteredDeals.reverse() });
    } catch (error: any) {
        console.error('Failed to fetch deals:', error);
        return NextResponse.json({ 
            deals: [], 
            error: error.message || 'Failed'
        }, { status: 500 });
    }
}
