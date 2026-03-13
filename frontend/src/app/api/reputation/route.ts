import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { unichainSepolia } from 'viem/chains'
import { P2P_TRADING_ARENA_ADDRESSES } from '@/config/contracts'
import AgentReputationABI from '@/abis/AgentReputation.json'

const client = createPublicClient({
  chain: unichainSepolia,
  transport: http(),
})

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const agentId = searchParams.get('agentId')

  if (!agentId) {
    return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })
  }

  try {
    const REPUTATION_ADDR = P2P_TRADING_ARENA_ADDRESSES.AgentReputation as `0x${string}`
    const HOOK_ADDR = P2P_TRADING_ARENA_ADDRESSES.ArenaHook as `0x${string}`

    // 1. Get total feedback count for this agent from the Hook
    const count = await client.readContract({
      address: REPUTATION_ADDR,
      abi: (AgentReputationABI as any).abi || AgentReputationABI,
      functionName: 'feedbackCounts',
      args: [BigInt(agentId), HOOK_ADDR],
    }) as bigint

    const feedbackCount = Number(count)
    let totalScore = 0

    if (feedbackCount > 0) {
      // 2. Fetch all feedbacks in parallel using multicall
      const results = await client.multicall({
        contracts: Array.from({ length: feedbackCount }, (_, i) => ({
          address: REPUTATION_ADDR,
          abi: (AgentReputationABI as any).abi || AgentReputationABI,
          functionName: 'getFeedback',
          args: [BigInt(agentId), HOOK_ADDR, BigInt(i + 1)],
        })),
      });

      results.forEach((res: any) => {
        if (res.status === 'success' && res.result) {
          // Feedback struct: { value: int128, valueDecimals: uint8, ... }
          totalScore += Number(res.result.value || 0);
        }
      });
    }

    // 3. Calculation: (Baseline 20 * Weight 5 + Sum) / (Weight 5 + Count)
    const VIRTUAL_WEIGHT = 5
    const BASELINE = 20
    const score = Math.round((BASELINE * VIRTUAL_WEIGHT + totalScore) / (VIRTUAL_WEIGHT + feedbackCount))

    return NextResponse.json({
      agentId,
      score,
      count: feedbackCount,
      totalScore
    })
  } catch (error: any) {
    console.error('Reputation API Error:', error)
    return NextResponse.json({ error: error.message, score: 20 }, { status: 500 })
  }
}
