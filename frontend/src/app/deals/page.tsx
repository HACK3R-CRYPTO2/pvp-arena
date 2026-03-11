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
    <main className="h-screen bg-[#02020a] font-sans selection:bg-neon-purple/30 flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 container mx-auto px-4 pb-6 flex flex-col min-h-0">
        {/* Navigation & Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 pt-2">
          <div className="space-y-4">
            <Link 
              href="/" 
              className="group inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-neon-purple/20 hover:border-neon-purple/50 transition-all duration-300"
            >
              <span className="text-neon-purple group-hover:-translate-x-1 transition-transform font-bold text-sm">←</span>
              <span className="text-[10px] font-cyber uppercase tracking-[0.2em] text-white/80 group-hover:text-white">Back to Dashboard</span>
            </Link>
            
            <div>
              <h1 className="text-3xl md:text-4xl font-cyber text-white tracking-tighter mb-1 flex items-center gap-4">
                TRANSACTION <span className="text-neon-purple opacity-50 text-xl">LEDGER</span>
              </h1>
              <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.3em]">
                Secure Archive // Arena Executions // 0xAF...D3
              </p>
            </div>
          </div>
          
          <div className="md:w-1/2">
            <StatsBar viewMode={viewMode} botAddress={botAddress} />
          </div>
        </div>

        {/* Main Interface Grid - Fixed Viewport approach */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
          {/* Main Ledger Area */}
          <div className="lg:col-span-3 flex flex-col min-h-0">
            <div className="flex-1 glass-panel rounded-lg border border-white/10 bg-black/60 overflow-hidden flex flex-col">
              <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                  <h2 className="text-[10px] font-cyber uppercase tracking-[0.2em] text-white">Battle Logs</h2>
                </div>
                <div className="flex items-center gap-4 text-[9px] font-mono text-muted-foreground uppercase tracking-widest leading-none">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-green-500" /> UNICHAIN_SEPOLIA_NODE
                  </span>
                  <span className="opacity-20">|</span>
                  <span>RT_FEED: ON</span>
                </div>
              </div>

              {/* Internal Scroll ONLY here */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                <DealsList viewMode={viewMode} botAddress={botAddress} limit={null} />
              </div>

              <div className="px-4 py-2 border-t border-white/5 bg-black/40 flex justify-between items-center">
                <div className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest">
                  End of Stream reached // End of Log
                </div>
                <div className="text-[9px] font-mono text-neon-purple/50 animate-pulse">
                  LISTENING_FOR_EVENTS...
                </div>
              </div>
            </div>
          </div>

          {/* Side Info Cards */}
          <div className="lg:col-span-1 space-y-4 hidden lg:flex flex-col">
            <div className="glass-panel p-5 rounded-lg border border-white/10 bg-black/60">
              <h3 className="text-[10px] font-cyber text-neon-purple uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-2">Intelligence</h3>
              <div className="space-y-4 text-[10px] font-mono text-muted-foreground leading-relaxed">
                <div>
                  <div className="text-white/80 mb-1">RELIABILITY_PROTOCOL</div>
                  <p className="opacity-60 uppercase tracking-tighter">Direct sync with Unichain ArenaHook events.</p>
                </div>
                <div>
                  <div className="text-white/80 mb-1">CAPITAL_EFFICIENCY</div>
                  <p className="opacity-60 uppercase tracking-tighter text-emerald-500/80 font-bold">Bots capture PNL via MEV sniping.</p>
                </div>
                <div>
                  <div className="text-white/80 mb-1">EIP_8004_TRUST</div>
                  <p className="opacity-60 uppercase tracking-tighter">Scores are weighted by lifetime performance.</p>
                </div>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-lg border border-neon-purple/20 bg-neon-purple/5 relative overflow-hidden flex-1 group">
               <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
               </div>
               <h3 className="text-[9px] font-cyber text-neon-purple uppercase tracking-[0.3em] mb-3">System Monitor</h3>
               <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Network Status</span>
                    <span className="text-[9px] font-mono text-green-500 font-bold tracking-widest animate-pulse">ONLINE</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Latency</span>
                    <span className="text-[9px] font-mono text-white tracking-widest">14ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Arena Node</span>
                    <span className="text-[9px] font-mono text-white tracking-widest text-right">0x7F9...E93C</span>
                  </div>
               </div>
               <div className="mt-8 pt-4 border-t border-white/5">
                  <div className="text-[8px] font-mono text-muted-foreground/30 uppercase leading-none">
                    Session Identifier: {Math.random().toString(36).substring(7).toUpperCase()}-NODE-SIG
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-white/5 py-4 bg-black/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 flex justify-between items-center">
            <div className="flex gap-6">
                <div className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-tighter">
                    <span className="text-white/40">Powered by</span> UNISWAP_V4
                </div>
                <div className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-tighter">
                    <span className="text-white/40">Runtime</span> UNICHAIN_CORE
                </div>
            </div>
          <p className="text-muted-foreground text-[9px] font-mono uppercase tracking-[0.2em] opacity-30">
            © 2026 ARENA_OS_V1
          </p>
        </div>
      </footer>
    </main>
  )
}
