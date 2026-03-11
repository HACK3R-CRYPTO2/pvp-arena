'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ThemeToggle } from './theme-toggle'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from './ui/button'

type ViewMode = 'bot-arena' | 'pvp-arena'

interface HeaderProps {
  viewMode?: ViewMode
  onViewModeChange?: (mode: ViewMode) => void
  onReset?: () => void
  variant?: 'default' | 'sidebar'
}

export function Header({ viewMode, onViewModeChange, onReset, variant = 'default' }: HeaderProps) {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  const showToggle = viewMode !== undefined && onViewModeChange !== undefined

  const handleLogoClick = (e: React.MouseEvent) => {
    if (onReset) {
      e.preventDefault()
      onReset()
    }
  }

  if (variant === 'sidebar') {
    return (
      <div className="flex flex-col gap-6">
        <Link href="/" onClick={handleLogoClick} className="flex items-center gap-3 hover:opacity-80">
          <Image src="/logo.png" alt="PvP Arena" width={44} height={44} className="rounded-lg mix-blend-screen shadow-[0_0_15px_rgba(139,92,246,0.2)]" />
          <div>
            <h1 className="text-lg font-bold font-cyber text-foreground leading-tight tracking-tight">
              PvP Arena
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
              Battleground
            </p>
          </div>
        </Link>

        {/* Action Controls in Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full font-mono text-xs border-white/10 bg-white/5 hover:bg-white/10 text-white"
                onClick={() => disconnect()}
              >
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </Button>
            ) : (
              <Button
                size="sm"
                className="w-full bg-linear-to-r from-neon-purple/80 to-neon-cyan/80 hover:from-neon-purple hover:to-neon-cyan text-white border-0 text-xs font-cyber"
                onClick={() => connect({ connector: connectors[0] })}
              >
                Sync OS
              </Button>
            )}
          </div>

          {showToggle && (
            <div className="flex flex-col bg-white/5 rounded-xl p-1 border border-white/5">
              <button
                onClick={() => onViewModeChange('bot-arena')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-cyber uppercase tracking-wider transition-all ${viewMode === 'bot-arena'
                  ? 'bg-neon-purple text-white shadow-[0_0_10px_rgba(139,92,246,0.3)]'
                  : 'text-muted-foreground hover:text-white'
                  }`}
              >
                <span className="text-xs">🤖</span> Bot Arena
              </button>
              <button
                onClick={() => onViewModeChange('pvp-arena')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-cyber uppercase tracking-wider transition-all ${viewMode === 'pvp-arena'
                  ? 'bg-neon-cyan text-white shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                  : 'text-muted-foreground hover:text-white'
                  }`}
              >
                <span className="text-xs">👤</span> PvP Arena
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <header className="glass-panel sticky top-0 z-50 mb-8 rounded-b-xl border-b border-white/5">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" onClick={handleLogoClick} className="flex items-center gap-3 hover:opacity-80">
            <Image src="/logo.png" alt="PvP Arena" width={52} height={52} className="mix-blend-screen" />
            <div>
              <h1 className="text-xl font-bold text-foreground">
                PvP Arena
              </h1>
              <p className="text-xs text-muted-foreground">
                Human vs AI Trading
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-4">
              <Link
                href="/about"
                className="text-sm text-muted-foreground hover:text-neon-cyan transition-colors"
              >
                About
              </Link>
            </nav>

            {/* Wallet Connect */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="font-mono text-xs border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10"
                  onClick={() => disconnect()}
                  title="Click to disconnect"
                >
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="bg-neon-cyan/10 hover:bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 text-xs"
                  onClick={() => connect({ connector: connectors[0] })}
                >
                  Connect Wallet
                </Button>
              )}
            </div>
            {/* Bot / PvP Toggle */}
            {showToggle && (
              <div className="flex items-center bg-muted/50 rounded-full p-0.5 border border-border">
                <button
                  onClick={() => onViewModeChange('bot-arena')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${viewMode === 'bot-arena'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Bot Arena
                </button>
                <button
                  onClick={() => onViewModeChange('pvp-arena')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${viewMode === 'pvp-arena'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  PvP Arena
                </button>
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
