import { NextResponse } from 'next/server';
import { createPublicClient, http, encodeFunctionData, decodeFunctionResult } from 'viem';
import { unichainSepolia } from 'viem/chains';
import AgentRegistryABI from '@/abis/AgentRegistry.json';
import { P2P_TRADING_ARENA_ADDRESSES } from '@/config/contracts';

const client = createPublicClient({
    chain: unichainSepolia,
    transport: http('https://unichain-sepolia-rpc.publicnode.com'),
});

const REGISTRY_ADDR = P2P_TRADING_ARENA_ADDRESSES.AgentRegistry as `0x${string}`;
const ABI = (AgentRegistryABI as any).abi || AgentRegistryABI;

export async function POST(req: Request) {
    try {
        const { ensName } = await req.json();
        if (!ensName) return NextResponse.json({ success: false });

        const nextAgentId = await client.readContract({
            address: REGISTRY_ADDR,
            abi: ABI,
            functionName: 'nextAgentId',
        }) as bigint;

        const lowerName = ensName.toLowerCase().replace('.pvparena.eth', '');

        for (let i = 1; i < Number(nextAgentId); i++) {
            const nameBytes = await client.readContract({
                address: REGISTRY_ADDR,
                abi: ABI,
                functionName: 'getMetadata',
                args: [BigInt(i), "name"]
            }) as `0x${string}`;

            if (nameBytes === '0x' || !nameBytes) continue;

            const agentName = Buffer.from(nameBytes.slice(2), 'hex').toString('utf8').toLowerCase();
            if (agentName === lowerName || agentName.includes(lowerName)) {
                const address = await client.readContract({
                    address: REGISTRY_ADDR,
                    abi: ABI,
                    functionName: 'getAgentWallet',
                    args: [BigInt(i)]
                }) as string;
                return NextResponse.json({ success: true, address });
            }
        }

        return NextResponse.json({ success: false });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Resolution failed' }, { status: 500 });
    }
}
