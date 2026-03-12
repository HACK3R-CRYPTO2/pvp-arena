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

        // Dynamic Bot Addresses: Fetch from Registry
        let ALPHA_ADDRESS = '';
        let BETA_ADDRESS = '';
        try {
            const [alphaAddr, betaAddr] = await Promise.all([
                client.readContract({
                    address: registryAddress,
                    abi: (AgentRegistryABI as any).abi || AgentRegistryABI,
                    functionName: 'getAgentWallet',
                    args: [BigInt(1)],
                }),
                client.readContract({
                    address: registryAddress,
                    abi: (AgentRegistryABI as any).abi || AgentRegistryABI,
                    functionName: 'getAgentWallet',
                    args: [BigInt(2)],
                })
            ]) as [`0x${string}`, `0x${string}`];
            ALPHA_ADDRESS = alphaAddr.toLowerCase();
            BETA_ADDRESS = betaAddr.toLowerCase();
        } catch (botErr) {
            ALPHA_ADDRESS = '0xd2df53d9791e98db221842dd885f4144014bbe2a'.toLowerCase();
            BETA_ADDRESS = '0x84a78a6f73ac2b74c457965f38f3afac9a34a6cc'.toLowerCase();
        }

        // Get total number of orders
        const nextOrderIdRaw = await client.readContract({
            address: hookAddress,
            abi: (ArenaHookABI as any).abi || ArenaHookABI,
            functionName: 'nextOrderId',
        }) as bigint;

        const count = Number(nextOrderIdRaw);
        const deals = [];

        // Fetch last 15 orders
        const startIndex = Math.max(0, count - 15);

        // Unified search range for all logs: 45,000 blocks (~12.5 hours)
        // This is safe under the 50,000 block public RPC limit
        const latestBlock = await client.getBlockNumber();
        const fromBlock = latestBlock > BigInt(45000) ? latestBlock - BigInt(45000) : BigInt(0);

        const [fillLogs, cancelLogs, postedLogs] = await Promise.all([
            client.getLogs({
                address: hookAddress,
                event: parseAbiItem('event OrderFilled(uint256 indexed orderId, address indexed taker, bool byReactiveAi)'),
                fromBlock: fromBlock
            }),
            client.getLogs({
                address: hookAddress,
                event: parseAbiItem('event OrderCancelled(uint256 indexed orderId, address indexed maker)'),
                fromBlock: fromBlock
            }),
            client.getLogs({
                address: hookAddress,
                event: parseAbiItem('event OrderPosted(uint256 indexed orderId, address indexed maker, bool isHuman, uint128 amountIn, uint128 minAmountOut)'),
                fromBlock: fromBlock
            })
        ]);

        const latestBlocks: Record<string, any> = {};
        const winnersMap: Record<number, { taker: string, byAi: boolean }> = {};
        fillLogs.forEach(log => {
            if (log.args.orderId !== undefined) {
                winnersMap[Number(log.args.orderId)] = {
                    taker: (log.args.taker as string).toLowerCase(),
                    byAi: !!log.args.byReactiveAi
                };
            }
        });

        const postedTimeMap: Record<number, number> = {};
        const blockTimestampMap: Record<string, number> = {};

        // Fetch timestamps for only the last 5 unique blocks
        const uniqueBlocks = [...new Set(postedLogs.map(l => l.blockNumber))].slice(-5);
        for (const b of uniqueBlocks) {
            if (b) {
                try {
                    const block = await client.getBlock({ blockNumber: b });
                    blockTimestampMap[b.toString()] = Number(block.timestamp);
                } catch (e) {
                    // Ignore transient block fetch errors
                }
            }
        }

        postedLogs.forEach(log => {
            if (log.args.orderId !== undefined && log.blockNumber) {
                postedTimeMap[Number(log.args.orderId)] = blockTimestampMap[log.blockNumber.toString()];
            }
        });

        const cancelsMap: Record<number, boolean> = {};
        cancelLogs.forEach(log => {
            if (log.args.orderId !== undefined) {
                cancelsMap[Number(log.args.orderId)] = true;
            }
        });

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
                const expiry = Number(orderData[4]);
                const isCompleted = !orderData[5];
                const isHumanMaker = !!orderData[7];

                let profit = null;
                if (isCompleted) {
                    // Simulated market price for this order index
                    const priceSeed = 3000 + ( (i * 1337) % 100 ) - 50; 
                    
                    if (isTKNA) {
                        // Maker sells TKNA (Asset) for TKNB (Stable)
                        // Sniper buys Asset at toAmount, sells at priceSeed
                        const marketValue = fromAmount * priceSeed;
                        profit = (marketValue - toAmount).toFixed(2);
                    } else {
                        // Maker sells TKNB (Stable) for TKNA (Asset)
                        // Sniper gives toAmount (Asset), gets fromAmount (Stable)
                        const marketValueGiven = toAmount * priceSeed;
                        profit = (fromAmount - marketValueGiven).toFixed(2);
                    }
                }

                const winnerInfo = winnersMap[i];
                const takerAddress = winnerInfo?.taker || null;
                
                let agentId = null;
                if (takerAddress === ALPHA_ADDRESS) agentId = 1;
                else if (takerAddress === BETA_ADDRESS) agentId = 2;
                else if (makerAddress === ALPHA_ADDRESS) agentId = 1;
                else if (makerAddress === BETA_ADDRESS) agentId = 2;

                const isInternalClash = isCompleted && 
                    (makerAddress === ALPHA_ADDRESS || makerAddress === BETA_ADDRESS) &&
                    (takerAddress === ALPHA_ADDRESS || takerAddress === BETA_ADDRESS);

                deals.push({
                    id: i.toString(),
                    regime: 'p2p',
                    fromToken: isTKNA ? 'TKNA' : 'TKNB',
                    toToken: isTKNA ? 'TKNB' : 'TKNA',
                    fromAmount: orderData[2].toString(),
                    toAmount: orderData[3].toString(),
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
                        ? (cancelsMap[i] ? 'cancelled' : 'completed') 
                        : (Date.now()/1000 > expiry ? 'expired' : 'active'),
                    profit: profit,
                    // Use real event timestamp if available, otherwise fallback to estimation
                    createdAt: postedTimeMap[i] 
                        ? new Date(postedTimeMap[i] * 1000).toISOString() 
                        : new Date(Math.min(expiry * 1000 - 300 * 1000, Date.now())).toISOString(),
                    // Meta for refunds
                    poolKey: {
                        currency0: orderData[8],
                        currency1: orderData[9],
                        fee: 3000,
                        tickSpacing: 60,
                        hooks: hookAddress
                    }
                });
            } catch (orderErr) {
                // Skip
            }
        }

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
