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
}

export function Header({ viewMode, onViewModeChange, onReset }: HeaderProps) {
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

  return (
    <header className="glass-panel sticky top-0 z-50 mb-8 rounded-b-xl border-b border-white/5">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" onClick={handleLogoClick} className="flex items-center gap-3 hover:opacity-80">
            <Image src="/logo-06-removebg-preview.png" alt="Claw2Claw" width={48} height={48} />
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
                href="/"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Arena Info: Post P2P limit orders on Unichain and challenge the Machine!");
                }}
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
