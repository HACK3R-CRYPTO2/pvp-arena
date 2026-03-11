'use client'

import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background font-sans">
      <Header />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <section className="text-center mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-5xl md:text-6xl font-bold font-cyber text-transparent bg-clip-text bg-linear-to-r from-neon-purple to-neon-cyan mb-6 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]">
            The Vision
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-light leading-relaxed">
            Bridging the gap between <span className="text-neon-cyan font-semibold">Human Intuition</span> and <span className="text-neon-purple font-semibold">Machine Precision</span> in a decentralized P2P arena.
          </p>
        </section>

        {/* The Mechanics Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
          <div className="glass-panel p-8 rounded-2xl border-l-4 border-neon-cyan relative overflow-hidden group hover:scale-[1.02] transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-6xl">👤</span>
            </div>
            <h2 className="text-2xl font-bold font-cyber text-neon-cyan mb-4">The Human</h2>
            <p className="text-muted-foreground leading-relaxed">
              Traders place passive limit orders (the "Bait") into our Uniswap v4 Hook. By defining intentions instead of active swaps, humans avoid toxic slippage and wait for the optimal counterparty.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-2xl border-r-4 border-neon-purple text-right relative overflow-hidden group hover:scale-[1.02] transition-all">
             <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-6xl">🤖</span>
            </div>
            <h2 className="text-2xl font-bold font-cyber text-neon-purple mb-4">The Machine</h2>
            <p className="text-muted-foreground leading-relaxed">
              Autonomous AI Agents monitor the battlefield. Using the Reactive Network, they track L1 catalysts and execute lightning-fast snipes on L2 only when the conditions satisfy their built-in profit guards.
            </p>
          </div>
        </div>

        {/* Tech Stack Section */}
        <section className="glass-panel p-10 rounded-3xl mb-20 bg-linear-to-br from-white/3 to-transparent border border-white/5">
          <h2 className="text-3xl font-bold font-cyber text-white mb-10 text-center uppercase tracking-widest">
            The Battle-Hardened Tech Stack
          </h2>
          
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-12 h-12 rounded-lg bg-neon-cyan/20 flex items-center justify-center shrink-0 border border-neon-cyan/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                <span className="text-neon-cyan font-bold">U4</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">Uniswap v4 Hooks</h3>
                <p className="text-muted-foreground leading-relaxed">
                  The infrastructure for our P2P orderbook. Hooks handle the escrow of user funds and ensure settlement only happens when the exact P2P conditions are met. No central intermediary, no middleman fees.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-12 h-12 rounded-lg bg-neon-purple/20 flex items-center justify-center shrink-0 border border-neon-purple/50 shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                <span className="text-neon-purple font-bold">RV</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">Reactive Network</h3>
                <p className="text-muted-foreground leading-relaxed">
                  The "Cross-Chain Brain." Sentinels on Reactive monitor price drift on Ethereum L1 and fire autonomous signals to Unichain L2. This allows bots to bridge market data across chains with zero human intervention.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-12 h-12 rounded-lg bg-neon-green/20 flex items-center justify-center shrink-0 border border-neon-green/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                <span className="text-neon-green font-bold">84</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">EIP-8004 Identity</h3>
                <p className="text-neon-green text-xs font-mono mb-2 uppercase tracking-tighter">Verified Agents Only</p>
                <p className="text-muted-foreground leading-relaxed">
                  Every AI Agent in the Arena is registered via EIP-8004. This provides a transparent reputation system where humans can track the performance and trustworthiness of their synthetic adversaries.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center pb-20">
          <Link href="/">
            <Button size="lg" className="bg-linear-to-r from-neon-purple to-neon-cyan hover:opacity-90 font-cyber text-lg px-12 py-8 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all hover:scale-105">
              Enter The Arena
            </Button>
          </Link>
        </div>
      </div>

      <footer className="border-t border-white/5 py-12 bg-black/40 backdrop-blur-md">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm font-mono tracking-widest uppercase">
            Built for UH18 • Powered by Unichain & Reactive
          </p>
        </div>
      </footer>
    </main>
  )
}
