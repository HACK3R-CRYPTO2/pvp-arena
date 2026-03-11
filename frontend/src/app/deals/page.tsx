'use client'

import { Header } from '@/components/header'
import { DealsList } from '@/components/deals-list'
import { StatsBar } from '@/components/stats-bar'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function DealsPage() {
    return (
        <Suspense>
            <DealsContent />
        </Suspense>
    )
}

function DealsContent() {
  const searchParams = useSearchParams()
  const botAddress = searchParams.get('botAddress') || null
  const viewMode = 'bot-arena'

  return (
    <main className="min-h-screen bg-[#050510] font-sans selection:bg-neon-purple/30">
      <Header />

      <div className="container mx-auto px-4 pt-12 pb-24">
        {/* Breadcrumb / Back */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="group flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-xs font-mono uppercase tracking-widest"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            Return to Battlefield
          </Link>
        </div>

        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-cyber text-white tracking-tighter mb-4 flex items-center gap-4">
              HISTORY <span className="text-neon-purple opacity-50 text-2xl">LOGGER</span>
            </h1>
            <p className="text-muted-foreground font-mono text-sm max-w-xl">
              The immutable ledger of combat. All on-chain executions, P2P snipes, and agent reputations are archived here for strategic review.
            </p>
          </div>
          
          <div className="stats-grid grid grid-cols-2 gap-4">
            <StatsBar viewMode={viewMode} botAddress={botAddress} />
          </div>
        </div>

        {/* Global Stats or Sub-Header */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="glass-panel rounded-lg border border-white/5 bg-black/40 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-neon-purple animate-pulse" />
                  <h2 className="text-sm font-cyber uppercase tracking-widest text-white">Full Transaction Ledger</h2>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground uppercase">
                  <span>Provider: Unichain Sepolia</span>
                  <span className="text-white/20">|</span>
                  <span>Updates: Real-time</span>
                </div>
              </div>

              <div className="h-[600px] overflow-y-auto custom-scrollbar">
                <DealsList viewMode={viewMode} botAddress={botAddress} limit={null} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="glass-panel p-6 rounded-lg border border-white/5 bg-black/40">
              <h3 className="text-xs font-cyber text-neon-purple uppercase tracking-widest mb-4">Intelligence Briefing</h3>
              <div className="space-y-4 text-xs font-mono text-muted-foreground leading-relaxed">
                <p>
                  <span className="text-white">RELIABILITY:</span> All trade data is sourced directly from the <span className="text-white">ArenaHook</span> event logs on Unichain.
                </p>
                <div className="h-px bg-white/5 w-full" />
                <p>
                  <span className="text-white">PNL CAPTURE:</span> Represents the USD value captured by AI agents through strategic arbitration.
                </p>
                <div className="h-px bg-white/5 w-full" />
                <p>
                  <span className="text-white">REPUTATION:</span> Reflects the EIP-8004 feedback score weighted against their total battlefield history.
                </p>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-lg border border-neon-purple/20 bg-neon-purple/5 group hover:border-neon-purple/40 transition-colors">
              <h3 className="text-[10px] font-cyber text-neon-purple uppercase tracking-[0.2em] mb-2">Network Status</h3>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-white">MONITOR</span>
                <span className="text-[10px] font-mono text-green-500 animate-pulse">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-white/5 py-12 bg-black/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 text-center">
            <div className="flex justify-center gap-8 mb-6">
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">
                    Powered by <span className="text-white font-bold">Uniswap v4</span>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">
                    Built on <span className="text-white font-bold">Unichain</span>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">
                    Secured by <span className="text-neon-purple font-bold">Reactive</span>
                </div>
            </div>
          <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-[0.3em] opacity-40">
            System Identity: PVP_ARENA_V1_CORE
          </p>
        </div>
      </footer>
    </main>
  )
}
