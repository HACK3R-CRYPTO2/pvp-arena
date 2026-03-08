'use client'

import { useReadContract } from 'wagmi'
import AgentRegistryABI from '@/abis/AgentRegistry.json'
import AgentReputationABI from '@/abis/AgentReputation.json'
import { P2P_TRADING_ARENA_ADDRESSES } from '@/config/contracts'
import { useEffect, useState } from 'react'
import { formatUnits } from 'viem'

// Pre-defined identities for the hackathon demo if lookup fails or to speed up
const WELL_KNOWN_IDENTITIES: Record<string, string> = {
    '0xd2df53d9791e98db221842dd085f4144014bbe2a': 'AlphaMachine',
    // Gaza's wallet should be added here dynamically or resolved via Registry
}

export function useAgentIdentity(address: string | undefined) {
    const [identity, setIdentity] = useState<string | null>(null)

    // 1. Check Well Known First
    useEffect(() => {
        if (address && WELL_KNOWN_IDENTITIES[address.toLowerCase()]) {
            setIdentity(WELL_KNOWN_IDENTITIES[address.toLowerCase()])
        }
    }, [address])

    // In a full implementation, we would query the AgentRegistry for the AgentID linked to this address
    // For the demo, we rely on the well-known map or hardcoded IDs (1 = Human, 2 = Alpha, 3 = Beta)

    return {
        name: identity || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown'),
        isBot: address?.toLowerCase() === '0xd2df53d9791e98db221842dd085f4144014bbe2a'
    }
}

export function useAgentReputation(agentId: number | undefined) {
    // AgentReputation.feedbacks(agentId, sentinelAddress, index)
    // For demo simplicity, we'll return a mock "Trust Score" if registry lookup is complex
    return {
        score: agentId ? 98 : 0,
        status: 'Proven'
    }
}
