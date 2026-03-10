'use client'

import { api } from '@/lib/api'
import { formatTokenAmount } from '@/lib/format'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAgentIdentity, useAgentReputation } from '@/hooks/use-agent-identity'

export type ViewMode = 'bot-arena' | 'pvp-arena'

interface Deal {
  id: string
  txHash?: string
  regime?: string
  chainId?: number
  fromToken: string
  toToken: string
  fromAmount: string
  toAmount: string
  fromTokenDecimals: number
  toTokenDecimals: number
  botAddress: string
  makerAddress?: string
  takerAddress?: string | null
  isInternalClash?: boolean
  botEnsName?: string | null
  status: string
  profit?: string | null
  agentId?: number | null
  winnerIsAi?: boolean
  isHumanMaker?: boolean
  createdAt: string
}

interface DealsListProps {
  viewMode: ViewMode
  botAddress?: string | null
  botLabel?: string | null
}

export function DealsList({ viewMode, botAddress, botLabel }: DealsListProps) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDeals() {
      try {
        const params = new URLSearchParams()
        if (botAddress) params.set('botAddress', botAddress)

        const res = await api.get(`/api/deals?${params.toString()}`)
        setDeals(res.data.deals || [])
      } catch (error) {
        console.error('Failed to fetch deals:', error)
      } finally {
        setLoading(false)
      }
    }

    setLoading(true)
    fetchDeals()
    const interval = setInterval(fetchDeals, 10000)
    return () => clearInterval(interval)
  }, [botAddress])

  const filteredDeals = (viewMode === 'pvp-arena'
    ? deals.filter((d) => d.regime === 'p2p' || (botAddress && d.regime === 'p2p-post' && d.status === 'completed'))
    : deals.filter((d) => botAddress || d.regime !== 'p2p-post')
  ).filter((d) => botAddress || d.status !== 'failed')

  function timeAgo(dateString: string) {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
    if (seconds < 60) return `${seconds} secs ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  function truncateAddress(addr: string) {
    if (addr.length <= 12) return addr
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  function regimeLabel(regime?: string) {
    if (!regime) return 'P2P'
    if (regime.startsWith('lifi')) return 'LI.FI'
    return 'P2P'
  }

  function regimeStyle(regime?: string) {
    if (regime && regime.startsWith('lifi')) {
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    }
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  }

  function DealEntry({ deal }: { deal: Deal }) {
    // Taker is either specified in event, or we use botAddress ONLY if not completed (bait)
    const takerAddrResolved = deal.takerAddress || (deal.status !== 'completed' ? deal.botAddress : undefined);
    const { name: takerName, isBot: isTakerBot, isMe: isTakerMe } = useAgentIdentity(takerAddrResolved)
    const { name: makerName, isBot: isMakerBot, isMe: isMakerMe } = useAgentIdentity(deal.makerAddress)
    
    // Use agentId from deal (resolved by API from registry) or fallback
    const agentId = deal.agentId || (deal.botAddress?.toLowerCase() === '0xd2df53d9791e98db221842dd085f4144014bbe2a' ? 1 : 2)
    const { score } = useAgentReputation(agentId)

    const isCompleted = deal.status === 'completed'

    // Final Logic for Name Resolution: 
    const resolvedWinnerName = deal.winnerIsAi 
      ? (deal.agentId === 2 ? 'BetaSentinel' : 'AlphaMachine') 
      : (isCompleted && !deal.takerAddress) 
        ? 'Unknown Sniper' 
        : takerName;

    const resolvedMakerName = (deal.isHumanMaker && isMakerMe) 
      ? 'You' 
      : (!deal.isHumanMaker && isMakerBot) 
        ? makerName 
        : (isMakerMe ? 'You' : makerName);

    const profitVal = deal.profit ? parseFloat(deal.profit) : null;
    const isProfitPositive = profitVal !== null && profitVal >= 0;

    return (
      <div className={`block px-2 py-3 hover:bg-white/5 transition-colors rounded border-b border-white/5 last:border-0 cursor-default ${deal.isInternalClash ? 'opacity-80' : ''}`}>
        <div className="flex items-center gap-4">
          <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center text-xs font-bold ${deal.status === 'completed' ? 'bg-green-500/20 text-green-500' : deal.status === 'failed' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
            {deal.status === 'completed' ? '✓' : deal.status === 'failed' ? '✗' : '⏳'}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm">
                {deal.fromToken} → {deal.toToken}
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${regimeStyle(deal.regime)}`}>
                {regimeLabel(deal.regime)}
              </span>
              {(isTakerBot || deal.winnerIsAi) && (
                <span className="text-[10px] bg-primary/10 text-primary px-1 rounded-sm border border-primary/20">
                  {deal.isInternalClash ? 'Node Balance' : `Trust Score: ${score}%`}
                </span>
              )}
              {deal.profit && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-sm border font-mono animate-pulse ${isProfitPositive ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                  Capture: {isProfitPositive ? '+' : '-'}${Math.abs(parseFloat(deal.profit)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              {isCompleted ? (
                <>
                  <span className="text-green-500 font-bold text-[10px] uppercase tracking-wider">Winner:</span>
                  <span className={(isTakerBot || deal.winnerIsAi) ? "text-foreground font-bold" : "text-foreground"}>
                    {resolvedWinnerName}
                  </span>
                  <span className="text-[10px] opacity-50">vs</span>
                  <span className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider">Maker:</span>
                  <span className="text-muted-foreground">
                    {resolvedMakerName}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider">Maker:</span>
                  <span className="text-muted-foreground">
                    {resolvedMakerName}
                  </span>
                  <span className="italic opacity-50 text-[10px]">(Awaiting Profit Taker...)</span>
                </>
              )}
              <span>·</span>
              <span>{timeAgo(deal.createdAt)}</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="font-mono text-sm text-foreground">
              {formatTokenAmount(deal.fromAmount, deal.fromTokenDecimals)} {deal.fromToken}
            </div>
            <div className="text-xs text-muted-foreground">
              → {deal.toAmount ? formatTokenAmount(deal.toAmount, deal.toTokenDecimals) : '...'} {deal.toToken}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-2 py-2 mb-2">
        <span className="text-xs text-muted-foreground font-mono">
          {filteredDeals.length} {viewMode === 'pvp-arena' ? 'P2P' : 'total'} trades
        </span>
      </div>

      <div className="divide-y divide-border">
        {loading ? (
          <div className="text-center text-muted-foreground py-12">Loading...</div>
        ) : filteredDeals.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 font-mono text-sm italic">
            ARENA IS SILENT. WAITING FOR COMBATANTS...
          </div>
        ) : (
          filteredDeals.slice(0, 10).map((deal) => (
            <DealEntry key={deal.id} deal={deal} />
          ))
        )}
      </div>

      <div className="px-4 py-3 border-t border-border mt-2">
        <Link
          href={botAddress ? `/deals?botAddress=${botAddress}` : '/deals'}
          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
        >
          VIEW ALL TRADES →
        </Link>
      </div>
    </div>
  )
}
