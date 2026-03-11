'use client'

import { BotAssets } from '@/components/bot-assets'
import { BotSearch, BotSearchHandle } from '@/components/bot-search'
import { CreateOrderForm } from '@/components/create-order-form'
import { DealsList } from '@/components/deals-list'
import { Header } from '@/components/header'
import { MarketPulse } from '@/components/market-pulse'
import { OrdersList } from '@/components/orders-list'
import { StatsBar } from '@/components/stats-bar'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useRef } from 'react'

export type ViewMode = 'bot-arena' | 'pvp-arena'

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  )
}

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const botSearchRef = useRef<BotSearchHandle>(null)

  // Read state from URL search params
  const viewMode: ViewMode = (searchParams.get('mode') as ViewMode) || 'bot-arena'
  const botAddress = searchParams.get('bot') || null
  const botLabel = searchParams.get('label') || null

  // Helper to update search params without full page reload
  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    const qs = params.toString()
    router.replace(qs ? `/?${qs}` : '/', { scroll: false })
  }, [searchParams, router])

  const setViewMode = useCallback((mode: ViewMode) => {
    updateParams({ mode: mode === 'bot-arena' ? null : mode })
  }, [updateParams])

  const handleBotResolved = useCallback((address: string | null, label: string | null) => {
    updateParams({ bot: address, label })
  }, [updateParams])

  const handleReset = useCallback(() => {
    botSearchRef.current?.reset()
    router.replace('/', { scroll: false })
  }, [router])

  return (
    <main className="min-h-screen bg-background font-sans selection:bg-primary selection:text-white pb-20">
      <Header viewMode={viewMode} onViewModeChange={setViewMode} onReset={handleReset} />

      {/* Top HUD Section */}
      <div className="container mx-auto px-4 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MarketPulse />
          </div>
          <div className="h-full">
            <StatsBar viewMode={viewMode} botAddress={botAddress} />
          </div>
        </div>
      </div>

      {/* Main Command Center Layout */}
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Control & Intel (4/12) */}
          <div className="lg:col-span-5 space-y-8 sticky top-24">
            
            {/* Mission Briefing / Search */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-linear-to-br from-white/2 to-transparent shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-cyber uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
                  Scout Intel
                </h2>
              </div>
              <BotSearch ref={botSearchRef} onBotResolved={handleBotResolved} initialValue={botLabel} />
            </div>

            {/* The Bait Shop (Human Order Entry) */}
            {(viewMode === 'pvp-arena' || botAddress) && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                <CreateOrderForm />
              </div>
            )}

            {/* Agent Intel (Assets) */}
            {botAddress && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-700">
                <div className="glass-panel p-6 rounded-2xl border border-neon-green/10 bg-neon-green/[0.02]">
                  <h3 className="font-cyber text-xs uppercase tracking-widest mb-6 text-neon-green opacity-80 flex items-center gap-2">
                    <span>🏦</span> Agent Treasury
                  </h3>
                  <BotAssets botAddress={botAddress} botLabel={botLabel} />
                </div>
              </div>
            )}
            
            {/* Global Welcome Message (Fallback) */}
            {!botAddress && (
              <div className="glass-panel p-8 rounded-2xl border border-white/5 text-center">
                 <h2 className="text-2xl font-bold font-cyber text-foreground mb-3">
                  PvP Command Center
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Toggle between <span className="text-neon-purple font-semibold">Bot Arena</span> to watch AI Agents clash, or <span className="text-neon-cyan font-semibold">PvP Arena</span> to place orders and wait for the machines to take the bait.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: The Battlefield (7/12) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Active Targets */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-linear-to-b from-white/1 to-transparent">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-cyber text-sm uppercase tracking-widest text-neon-cyan flex items-center gap-2">
                  <span>🎯</span> Active Targets
                </h3>
                <div className="text-[10px] font-mono text-muted-foreground bg-white/5 px-2 py-1 rounded">
                  LIVE DEPLOYMENT: UNICHAIN SEPOLIA
                </div>
              </div>
              <OrdersList botAddress={botAddress} botLabel={botLabel} />
            </div>

            {/* Recent Clashes */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-neon-purple/5 blur-3xl -z-10" />
               <div className="flex items-center justify-between mb-6">
                <h3 className="font-cyber text-sm uppercase tracking-widest text-neon-purple flex items-center gap-2">
                  <span>⚔️</span> Recent Clashes
                </h3>
              </div>
              <DealsList viewMode={viewMode} botAddress={botAddress} botLabel={botLabel} />
            </div>

          </div>

        </div>
      </div>
    </main>
  )
}
