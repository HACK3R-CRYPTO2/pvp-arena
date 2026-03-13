'use client'

import { api } from '@/lib/api'
import { useEffect, useState } from 'react'

type ViewMode = 'bot-arena' | 'pvp-arena'

interface Stats {
  totalTrades: number
  tradesPerHour: number
  reactiveExecs: number
  totalVolume: number
  totalPnl?: number | null
}

interface StatsBarProps {
  viewMode: ViewMode
  botAddress?: string | null
  variant?: 'default' | 'compact'
}

export function StatsBar({ viewMode, botAddress, variant = 'default' }: StatsBarProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const params = new URLSearchParams()
        if (botAddress) params.set('botAddress', botAddress)

        const res = await api.get(`/api/deals/stats?${params.toString()}`)
        const s = res.data.stats

        setStats({
          totalTrades: s.totalTrades,
          tradesPerHour: s.tradesPerHour,
          reactiveExecs: s.reactiveExecs,
          totalVolume: s.totalVolume,
          totalPnl: s.totalPnl ?? null,
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    setLoading(true)
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [botAddress])

  if (loading || !stats) {
    return (
      <div className={`flex items-center gap-4 ${variant === 'compact' ? '' : 'mb-8'}`}>
        {[...Array(variant === 'compact' ? 3 : 4)].map((_, i) => (
          <div key={i} className={`glass-card rounded-xl animate-pulse ${variant === 'compact' ? 'px-3 py-1.5' : 'p-4'}`}>
            <div className="h-2 bg-muted rounded w-12 mb-1"></div>
            <div className="h-3 bg-muted rounded w-16"></div>
          </div>
        ))}
      </div>
    )
  }

  const showPnl = botAddress && stats.totalPnl !== null && stats.totalPnl !== undefined
  const pnlPositive = showPnl && stats.totalPnl! >= 0

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-6 overflow-hidden">
         {/* Trades Metric */}
        <div className="flex flex-col group transition-all">
          <span className="text-[9px] font-cyber text-muted-foreground/50 tracking-widest uppercase">Trades</span>
          <div className="flex items-baseline gap-1">
             <span className="text-sm font-mono font-bold text-foreground">
               {Math.round(stats.totalTrades).toLocaleString()}
             </span>
             <span className="text-[10px] text-muted-foreground/60">OPS</span>
          </div>
        </div>

        <div className="h-6 w-px bg-white/5" />

        {/* Swap Metric */}
        <div className="flex flex-col group transition-all">
          <span className="text-[9px] font-cyber text-muted-foreground/50 tracking-widest uppercase">Reactive</span>
          <div className="flex items-baseline gap-1">
             <span className="text-sm font-mono font-bold text-foreground">{stats.reactiveExecs}</span>
             <span className="text-[10px] text-muted-foreground/60">SNPS</span>
          </div>
        </div>

        <div className="h-6 w-px bg-white/5" />

        {/* Value Metric */}
        <div className="flex flex-col group transition-all">
          <span className="text-[9px] font-cyber text-muted-foreground/50 tracking-widest uppercase">{showPnl ? 'PNL' : 'Volume'}</span>
          <div className="flex items-baseline gap-1">
             {showPnl ? (
                <span className={`text-sm font-mono font-bold ${pnlPositive ? 'text-neon-green' : 'text-red-400'}`}>
                   {pnlPositive ? '+' : ''}${Math.round(stats.totalPnl!).toLocaleString()}
                </span>
             ) : (
                <span className="text-sm font-mono font-bold text-foreground">
                  ${Math.round(stats.totalVolume).toLocaleString()}
                </span>
             )}
             <span className="text-[10px] text-muted-foreground/60">USD</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {/* Trades/Hour */}
      <div className="glass-panel border border-white/10 bg-black/60 rounded-lg p-5 group hover:border-neon-purple/50 transition-all duration-300 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-neon-purple shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
        <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-cyber tracking-[0.2em] mb-3 opacity-70 group-hover:opacity-100 transition-opacity">
          <svg className="w-3.5 h-3.5 text-neon-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>RATE/HOUR</span>
        </div>
        <div className="font-mono font-bold text-2xl text-white tracking-tighter">
          {Math.round(stats.tradesPerHour)}
          <span className="text-[10px] ml-2 font-normal uppercase opacity-30 tracking-widest">unit</span>
        </div>
      </div>

      {/* Total Trades */}
      <div className="glass-panel border border-white/10 bg-black/60 rounded-lg p-5 group hover:border-blue-400/50 transition-all duration-300 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
        <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-cyber tracking-[0.2em] mb-3 opacity-70 group-hover:opacity-100 transition-opacity">
          <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>MISSION COUNT</span>
        </div>
        <div className="font-mono font-bold text-2xl text-white tracking-tighter">
          {Math.round(stats.totalTrades).toLocaleString()}
          <span className="text-[10px] ml-2 font-normal uppercase opacity-30 tracking-widest">ops</span>
        </div>
      </div>

      {/* REACTIVE EXECS */}
      <div className="glass-panel border border-white/10 bg-black/60 rounded-lg p-5 group hover:border-cyan-400/50 transition-all duration-300 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
        <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-cyber tracking-[0.2em] mb-3 opacity-70 group-hover:opacity-100 transition-opacity">
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span>REACTIVE EXEC</span>
        </div>
        <div className="font-mono font-bold text-2xl text-white tracking-tighter">
          {stats.reactiveExecs} <span className="text-[10px] ml-1 font-normal uppercase opacity-30 tracking-widest">snps</span>
        </div>
      </div>

      {/* Total Volume → PNL when bot is selected */}
      <div className="glass-panel border border-white/10 bg-black/60 rounded-lg p-5 group hover:border-emerald-500/50 transition-all duration-300 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
        <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-cyber tracking-[0.2em] mb-3 opacity-70 group-hover:opacity-100 transition-opacity">
          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span>{showPnl ? 'PNL CAPTURE' : 'ARENA VOLUME'}</span>
        </div>
        <div className="font-mono font-bold text-2xl text-white tracking-tighter">
          {showPnl ? (
            <>
              <span className={pnlPositive ? 'text-emerald-400' : 'text-rose-500'}>
                {pnlPositive ? '+' : ''}{Math.round(stats.totalPnl!).toLocaleString()}
              </span>
              <span className="text-[10px] ml-1 font-normal opacity-30 tracking-widest">USD</span>
            </>
          ) : (
            <>
              ${Math.round(stats.totalVolume).toLocaleString()} <span className="text-[10px] font-normal opacity-30 uppercase tracking-widest leading-none">usdc</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
