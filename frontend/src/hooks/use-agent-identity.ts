'use client'

import { useReadContract, useAccount, usePublicClient } from 'wagmi'
import AgentRegistryABI from '@/abis/AgentRegistry.json'
import { P2P_TRADING_ARENA_ADDRESSES } from '@/config/contracts'
import { useEffect, useState } from 'react'
import { parseAbiItem } from 'viem'

import { useMemo } from 'react';

// Demo Fallbacks for Hackathon
const ALPHA_FALLBACK = '0xd2df53d9791e98db221842dd885f4144014bbe2a'.toLowerCase();
const BETA_FALLBACK = '0x84a78a6f73ac2b74c457965f38f3afac9a34a6cc'.toLowerCase();

export function useAgentIdentity(address: string | undefined) {
    const { address: currentAccount } = useAccount();
    const registryAddress = P2P_TRADING_ARENA_ADDRESSES.AgentRegistry as `0x${string}`;

    // Fetch dynamic bot addresses from Registry
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

    return useMemo(() => {
        const alphaAddr = (alphaWallet as string)?.toLowerCase() || ALPHA_FALLBACK;
        const betaAddr = (betaWallet as string)?.toLowerCase() || BETA_FALLBACK;
        const targetAddr = address?.toLowerCase();
        const meAddr = currentAccount?.toLowerCase();

        let name = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown';
        let isBot = false;
        let isMe = false;

        if (targetAddr) {
            if (targetAddr === alphaAddr) {
                name = 'AlphaMachine';
                isBot = true;
            } else if (targetAddr === betaAddr) {
                name = 'BetaSentinel';
                isBot = true;
            } else if (targetAddr === meAddr) {
                name = 'You';
                isMe = true;
            }
        }

        return { name, isBot, isMe };
    }, [address, currentAccount, alphaWallet, betaWallet]);
}

export function useAgentReputation(agentId: number | undefined) {
    const publicClient = usePublicClient()
    const [score, setScore] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!agentId) return

        async function fetchReputation() {
            setLoading(true)
            try {
                const res = await fetch(`/api/reputation?agentId=${agentId}`)
                if (!res.ok) throw new Error('Reputation fetch failed')
                const data = await res.json()
                setScore(data.score || 20)
            } catch (error) {
                console.error('Failed to fetch reputation from API:', error)
                setScore(20) // Fallback to baseline
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

