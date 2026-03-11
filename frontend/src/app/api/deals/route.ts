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
        const blockTimestampMap: Record<string, number> = {};
        const uniqueBlocks = [...new Set([
            ...fillLogs.map(l => l.blockNumber?.toString()),
            ...cancelLogs.map(l => l.blockNumber?.toString()),
            ...postedLogs.map(l => l.blockNumber?.toString())
        ])].filter(Boolean) as string[];

        // Fetch timestamps for unique blocks (limit to last 20 unique blocks to keep it fast)
        const blocksToFetch = uniqueBlocks.slice(-20);
        await Promise.all(blocksToFetch.map(async (b) => {
            try {
                const block = await client.getBlock({ blockNumber: BigInt(b) });
                blockTimestampMap[b] = Number(block.timestamp);
            } catch (e) { /* ignore */ }
        }));

        const deals: any[] = [];
        
        // Use all available IDs to reconstruct history
        const allIds = new Set([
            ...fillLogs.map(l => Number(l.args.orderId)),
            ...cancelLogs.map(l => Number(l.args.orderId)),
            ...postedLogs.map(l => Number(l.args.orderId))
        ]);

        const sortedIds = Array.from(allIds).sort((a, b) => b - a);
        // Limit to 20 to keep it responsive
        const displayIds = sortedIds.slice(0, 20);

        // Identify all blocks needed for these IDs
        const blocksNeeded = new Set<string>();
        for (const i of displayIds) {
            const l = postedLogs.find(l => Number(l.args.orderId) === i) ||
                      fillLogs.find(l => Number(l.args.orderId) === i) ||
                      cancelLogs.find(l => Number(l.args.orderId) === i);
            if (l?.blockNumber) blocksNeeded.add(l.blockNumber.toString());
        }

        // Fetch those block timestamps
        await Promise.all(Array.from(blocksNeeded).map(async (b) => {
            if (blockTimestampMap[b]) return;
            try {
                const block = await client.getBlock({ blockNumber: BigInt(b) });
                blockTimestampMap[b] = Number(block.timestamp);
            } catch (e) { /* ignore */ }
        }));

        for (const i of displayIds) {
            try {
                const post = postedLogs.find(l => Number(l.args.orderId) === i);
                const fill = fillMap[i];
                const cancel = cancelsMap[i];
                
                let orderData: any;
                let logBlock: string | undefined;
                
                if (post) {
                    orderData = [
                        post.args.maker,
                        post.args.isHuman ? false : true, 
                        post.args.amountIn,
                        post.args.minAmountOut,
                        0, 
                        fill || cancel ? false : true,
                    ];
                    logBlock = post.blockNumber?.toString();
                } else {
                    orderData = await client.readContract({
                        address: hookAddress,
                        abi: (ArenaHookABI as any).abi || ArenaHookABI,
                        functionName: 'orders',
                        args: [BigInt(i)],
                    }) as any;
                    logBlock = fillLogs.find(l => Number(l.args.orderId) === i)?.blockNumber?.toString() ||
                               cancelLogs.find(l => Number(l.args.orderId) === i)?.blockNumber?.toString();
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

                // Use real timestamp if available, fallback to mock based on block number diff
                // 1 block ~= 1 second on Unichain
                const blockDiff = logBlock ? (Number(latestBlock) - Number(logBlock)) : (count - i) * 60;
                const timestamp = logBlock && blockTimestampMap[logBlock] 
                    ? blockTimestampMap[logBlock] * 1000 
                    : Date.now() - (blockDiff * 1000);

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
                    createdAt: new Date(timestamp).toISOString()
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
