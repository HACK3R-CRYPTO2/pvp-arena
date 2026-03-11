import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
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

        // Unified search range: 40,000 blocks (~11 hours)
        // This is safe under the 50,000 block public RPC limit
        const latestBlock = await client.getBlockNumber();
        const fromBlock = latestBlock > BigInt(40000) ? latestBlock - BigInt(40000) : BigInt(0);

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

        const fillMap: Record<number, { taker: string, byAi: boolean }> = {};
        fillLogs.forEach(l => {
            fillMap[Number(l.args.orderId)] = { 
                taker: (l.args.taker as string).toLowerCase(),
                byAi: !!l.args.byReactiveAi
            };
        });

        const cancelsMap: Record<number, string> = {};
        cancelLogs.forEach(l => {
            cancelsMap[Number(l.args.orderId)] = (l.args.maker as string).toLowerCase();
        });

        const deals: any[] = [];
        
        // Use all available IDs to reconstruct history
        const allIds = new Set([
            ...fillLogs.map(l => Number(l.args.orderId)),
            ...cancelLogs.map(l => Number(l.args.orderId)),
            ...postedLogs.map(l => Number(l.args.orderId))
        ]);

        const sortedIds = Array.from(allIds).sort((a, b) => b - a);

        for (const i of sortedIds) {
            try {
                const post = postedLogs.find(l => Number(l.args.orderId) === i);
                const fill = fillMap[i];
                const cancel = cancelsMap[i];
                
                let orderData: any;
                if (post) {
                    orderData = [
                        post.args.maker,
                        post.args.isHuman ? false : true, 
                        post.args.amountIn,
                        post.args.minAmountOut,
                        0, 
                        fill || cancel ? false : true,
                    ];
                } else {
                    orderData = await client.readContract({
                        address: hookAddress,
                        abi: (ArenaHookABI as any).abi || ArenaHookABI,
                        functionName: 'orders',
                        args: [BigInt(i)],
                    }) as any;
                }

                const makerAddress = orderData[0].toLowerCase();
                const isTKNA = orderData[1];
                const fromAmount = formatUnits(orderData[2], 18);
                const toAmount = formatUnits(orderData[3], 18);
                const isCompleted = !orderData[5];
                const isHumanMaker = !!orderData[7];

                let profit = null;
                if (isCompleted && !cancel) {
                    const priceSeed = 3000 + ( (i * 1337) % 100 ) - 50; 
                    if (isTKNA) {
                        const marketValue = parseFloat(fromAmount) * priceSeed;
                        profit = (marketValue - parseFloat(toAmount)).toFixed(2);
                    } else {
                        const marketValueGiven = parseFloat(toAmount) * priceSeed;
                        profit = (parseFloat(fromAmount) - marketValueGiven).toFixed(2);
                    }
                }

                const takerAddress = fill?.taker || null;
                const winnerIsAi = fill?.byAi || false;
                
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
                    winnerIsAi: winnerIsAi,
                    isHumanMaker: isHumanMaker,
                    agentId: agentId,
                    isInternalClash: isInternalClash,
                    status: cancel ? 'cancelled' : (isCompleted ? 'completed' : 'active'),
                    profit: profit,
                    createdAt: new Date(Date.now() - (count - i) * 60000).toISOString()
                });
            } catch (err) {
                continue;
            }
        }

        const filteredDeals = filterAddress 
            ? deals.filter(d => 
                d.makerAddress.toLowerCase() === filterAddress || 
                d.takerAddress?.toLowerCase() === filterAddress
              )
            : deals;

        return NextResponse.json({ deals: filteredDeals });
    } catch (error: any) {
        console.error('Failed to fetch deals:', error);
        return NextResponse.json({ 
            deals: [], 
            error: error.message || 'Failed to fetch deals' 
        }, { status: 500 });
    }
}
