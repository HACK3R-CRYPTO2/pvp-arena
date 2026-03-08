'use client'

import { Header } from '@/components/header'
import { OrdersList } from '@/components/orders-list'
import { StatsBar } from '@/components/stats-bar'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

export default function OrdersPage() {
    return (
        <Suspense>
            <OrdersContent />
        </Suspense>
    )
}

function OrdersContent() {
    const searchParams = useSearchParams()
    const botAddress = searchParams.get('botAddress') || null
    const viewMode = 'pvp-arena'

    return (
        <main className="min-h-screen bg-background font-sans">
            <Header />

            <div className="container mx-auto px-4 pt-12 pb-12">
                <div className="mb-8 text-center text-neon-cyan">
                    <h1 className="text-3xl font-cyber mb-2">Order Book</h1>
                    <p className="text-muted-foreground font-mono text-sm tracking-widest uppercase">Live P2P Liquidity on Unichain</p>
                </div>

                <div className="mb-8">
                    <StatsBar viewMode={viewMode} botAddress={botAddress} />
                </div>

                <div className="glass-panel p-8 rounded-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-cyber text-white">Active Orders</h2>
                        <div className="text-xs font-mono text-muted-foreground uppercase">Real-time Feed</div>
                    </div>
                    <OrdersList botAddress={botAddress} />
                </div>
            </div>

            <footer className="border-t border-white/5 py-8 mt-12 bg-black/40 backdrop-blur-sm">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-muted-foreground text-sm font-mono tracking-tighter">
                        PROCESSED VIA <span className="text-neon-cyan font-bold">REACTIVE NETWORK</span> • LAYER 1 <span className="text-white">ETHEREUM</span> • LAYER 2 <span className="text-white">UNICHAIN</span>
                    </p>
                </div>
            </footer>
        </main>
    )
}
