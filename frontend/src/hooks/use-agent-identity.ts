'use client'

import { useReadContract, useAccount, usePublicClient } from 'wagmi'
import AgentRegistryABI from '@/abis/AgentRegistry.json'
import { P2P_TRADING_ARENA_ADDRESSES } from '@/config/contracts'
import { useEffect, useState } from 'react'
import { parseAbiItem } from 'viem'

// Demo Fallbacks for Hackathon
const ALPHA_FALLBACK = '0xd2df53d9791e98db221842dd085f4144014bbe2a'.toLowerCase();
const BETA_FALLBACK = '0x84a78a6f73ac2b74c457965f38f3afac9a34a6cc'.toLowerCase();

export function useAgentIdentity(address: string | undefined) {
    const { address: currentAccount } = useAccount();
    const registryAddress = P2P_TRADING_ARENA_ADDRESSES.AgentRegistry as `0x${string}`;

    // Fetch dynamic bot addresses from Registry (demo uses ID 1 and 2)
    const { data: alphaWallet } = useReadContract({
        address: registryAddress,
        abi: (AgentRegistryABI as any).abi || AgentRegistryABI,
        functionName: 'getAgentWallet',
        args: [BigInt(1)],
    });

    const { data: betaWallet } = useReadContract({
        address: registryAddress,
        abi: (AgentRegistryABI as any).abi || AgentRegistryABI,
        functionName: 'getAgentWallet',
        args: [BigInt(2)],
    });

    const alphaAddr = (alphaWallet as string)?.toLowerCase() || ALPHA_FALLBACK;
    const betaAddr = (betaWallet as string)?.toLowerCase() || BETA_FALLBACK;
    const targetAddr = address?.toLowerCase();
    const meAddr = currentAccount?.toLowerCase();

    let name = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown';
    let isBot = false;
    let isMe = false;

    if (targetAddr) {
        // Priority 1: Check Bot Addresses (takes precedence over 'You' if shared)
        if (targetAddr === alphaAddr) {
            name = 'AlphaMachine';
            isBot = true;
        } else if (targetAddr === betaAddr) {
            name = 'BetaSentinel';
            isBot = true;
        } 
        // Priority 2: Check Session
        else if (targetAddr === meAddr) {
            name = 'You';
            isMe = true;
        }
    }

    return {
        name,
        isBot,
        isMe
    }
}

export function useAgentReputation(agentId: number | undefined) {
    const publicClient = usePublicClient()
    const [score, setScore] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!agentId || !publicClient) return

        async function fetchReputation() {
            setLoading(true)
            try {
                // Query all NewFeedback events for this agent
                const logs = await publicClient!.getLogs({
                    address: P2P_TRADING_ARENA_ADDRESSES.AgentReputation as `0x${string}`,
                    event: parseAbiItem('event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)'),
                    args: {
                        agentId: BigInt(agentId!)
                    },
                    fromBlock: BigInt(46390000)
                })

                // Calculation: (Baseline 60 * Weight + Sum of On-Chain Successes) / (Weight + Count of Logs)
                // Using a VIRTUAL_WEIGHT (e.g., 10) prevents the score from "boosting" too fast.
                const VIRTUAL_WEIGHT = 10;
                let total = BigInt(60 * VIRTUAL_WEIGHT) 
                logs.forEach(log => {
                    if (log.args && log.args.value !== undefined) {
                        total += BigInt(log.args.value as any)
                    }
                })

                const average = Number(total) / (logs.length + VIRTUAL_WEIGHT)
                setScore(Math.round(average))
            } catch (error) {
                console.error('Failed to fetch reputation from logs:', error)
                setScore(60) // Fallback
            } finally {
                setLoading(false)
            }
        }

        fetchReputation()
    }, [agentId, publicClient])

    return {
        score: score ?? (agentId ? 60 : 0),
        status: loading ? 'Syncing...' : (score ? 'On-Chain' : 'Neutral')
    }
}

