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

type ViewMode = 'bot-arena' | 'pvp-arena'

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
    <main className="flex h-screen bg-background overflow-hidden selection:bg-primary/30 selection:text-white">

      {/* LEFT SIDEBAR: Nav & Discovery (3/12 or fixed 320px) */}
      <aside className="w-80 border-r border-white/5 bg-black/40 backdrop-blur-xl flex flex-col shrink-0">
        <div className="p-6 border-b border-white/5">
          <Header viewMode={viewMode} onViewModeChange={setViewMode} onReset={handleReset} variant="sidebar" />
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          {/* Search / Scout */}
          <div className="space-y-4">
            <h2 className="text-[10px] font-cyber uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan/50" />
              Intelligence Scout
            </h2>
            <BotSearch ref={botSearchRef} onBotResolved={handleBotResolved} initialValue={botLabel} />
          </div>

          {/* Bot Intel (Assets) */}
          {botAddress ? (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="glass-panel p-5 rounded-2xl border border-neon-green/20 bg-neon-green/[0.02] shadow-[0_0_20px_rgba(34,197,94,0.05)]">
                <BotAssets botAddress={botAddress} botLabel={botLabel} />
              </div>
            </div>
          ) : (
            <div className="glass-panel p-6 rounded-xl border border-white/5 text-center bg-white/1">
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                &quot;Wait for the Machine to take the bait, or scout the ENS registry to witness their portfolio.&quot;
              </p>
            </div>
          )}

          {/* Mission Control Links */}
          <div className="pt-4 border-t border-white/5">
            <Link href="/about" className="group flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all">
              <span className="text-sm font-cyber uppercase text-muted-foreground group-hover:text-white">Mission Briefing</span>
              <span className="text-muted-foreground group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>

        {/* System Status Footer */}
        <div className="p-4 bg-white/2 border-t border-white/5">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>NETWORK: UNICHAIN</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
              ONLINE
            </span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT: The Battlefield */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.05),transparent)]">

        {/* HUD Area (Fixed) */}
        <header className="h-16 border-b border-white/5 bg-black/20 flex items-center px-8 justify-between shrink-0">
          <div className="flex-1 max-w-2xl">
            <MarketPulse variant="slim" />
          </div>
          <div className="flex-1 flex justify-end">
            <StatsBar viewMode={viewMode} botAddress={botAddress} variant="compact" />
          </div>
        </header>

        {/* Dash Grid (Now flex-1 and potentially restricted) */}
        <div className="flex-1 p-6 lg:p-8 flex flex-col min-h-0 overflow-hidden space-y-6">
          
          {/* Full-width Order Entry Area */}
          {(viewMode === 'pvp-arena' || botAddress) && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
              <CreateOrderForm variant="wide" />
            </div>
          )}

          <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-8 min-h-0">
            
            {/* Active Targets Area */}
            <section className="flex flex-col min-h-0">
              <div className="flex items-center justify-between px-2 mb-3">
                <h3 className="font-cyber text-[10px] uppercase tracking-[0.2em] text-neon-cyan flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-neon-cyan/50 rotate-45" />
                  Active Targets
                </h3>
              </div>
              <div className="flex-1 glass-panel p-2 rounded-2xl border border-white/5 bg-white/1 overflow-y-auto custom-scrollbar">
                <OrdersList botAddress={botAddress} botLabel={botLabel} />
              </div>
            </section>

            {/* Live Feed Area */}
            <section className="flex flex-col min-h-0">
              <div className="flex items-center justify-between px-2 mb-3">
                <h3 className="font-cyber text-[10px] uppercase tracking-[0.2em] text-neon-purple flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-neon-purple/50 rotate-45" />
                  Live Feed
                </h3>
                <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest">Recent 7 Sessions</span>
              </div>
              <div className="flex-1 glass-panel p-2 rounded-2xl border border-white/5 bg-white/1 overflow-y-auto custom-scrollbar">
                <DealsList viewMode={viewMode} botAddress={botAddress} botLabel={botLabel} limit={7} />
              </div>
            </section>

          </div>

          <footer className="mt-6 flex justify-between items-center px-2 opacity-50 grayscale hover:grayscale-0 transition-all">
            <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-[0.3em]">
              © 2026 ARENA_OS_V1 // UNICHAIN_SEPOLIA_NODE
            </div>
            <div className="flex gap-4">
               <span className="text-[9px] font-cyber text-muted-foreground tracking-[0.2em] uppercase">Powered by Uniswap v4</span>
               <span className="text-[9px] font-cyber text-muted-foreground tracking-[0.2em] uppercase">Reactive</span>
            </div>
          </footer>
        </div>
      </div>
    </main>
  )
}
