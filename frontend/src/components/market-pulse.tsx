'use client'

import { useEffect, useState } from 'react'
import { Activity, TrendingUp, Zap } from 'lucide-react'

interface MarketState {
  ethPrice: number
  volatility: number
  lastUpdate: number
}

export function MarketPulse() {
  const [state, setState] = useState<MarketState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('http://localhost:3001/status')
        if (res.ok) {
          const data = await res.json()
          setState(data)
        }
      } catch (error) {
        // Silent fail for demo if backend is not yet fully up
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 3000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !state) {
    return (
      <div className="glass-panel p-4 rounded-xl flex items-center justify-between animate-pulse">
        <div className="h-4 bg-white/10 w-32 rounded"></div>
        <div className="h-4 bg-white/10 w-32 rounded"></div>
      </div>
    )
  }

  const isVolatile = state.volatility > 2.0

  return (
    <div className={`glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 transition-all duration-500 ${isVolatile ? 'border-neon-purple shadow-[0_0_15px_rgba(168,85,247,0.4)] bg-neon-purple/5' : 'border-white/5'}`}>
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <TrendingUp size={12} className="text-neon-cyan" /> L1 Reference (ETH)
          </span>
          <span className="text-xl font-cyber text-foreground">
            ${state.ethPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="h-8 w-px bg-white/10 hidden sm:block" />

        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <Activity size={12} className={isVolatile ? 'text-neon-purple' : 'text-neon-green'} /> Volatility
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-cyber ${isVolatile ? 'text-neon-purple' : 'text-neon-green'}`}>
              {state.volatility.toFixed(2)}%
            </span>
            {isVolatile && (
              <Zap size={16} className="text-neon-purple animate-bounce" />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Reactive Sentinel
          </span>
          <span className={`text-xs font-mono font-bold ${isVolatile ? 'text-neon-purple' : 'text-neon-cyan'}`}>
            {isVolatile ? '🚨 TARGET ACQUISITION ACTIVE' : '📡 MONITORING L1 SIGNALS'}
          </span>
        </div>
        <div className={`w-3 h-3 rounded-full ${isVolatile ? 'bg-neon-purple animate-ping' : 'bg-neon-cyan opacity-50'}`} />
      </div>
    </div>
  )
}
