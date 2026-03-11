'use client'

import { backendApi } from '@/lib/api'
import { useEffect, useState } from 'react'

interface Asset {
  chainId: number
  symbol: string
  name: string
  amountFormatted: string
  priceUSD: string
  valueUSD: number
  logoURI?: string
}

interface BotAssetsProps {
  botAddress: string | null
  botLabel?: string | null
}

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  10: 'Optimism',
  56: 'BNB Chain',
  100: 'Gnosis',
  137: 'Polygon',
  250: 'Fantom',
  8453: 'Base',
  42161: 'Arbitrum',
  43114: 'Avalanche',
  1301: 'Unichain Sepolia',
  11155111: 'Sepolia',
  84532: 'Base Sepolia',
}

function formatAmount(amount: string, symbol: string) {
  const num = parseFloat(amount)
  if (num === 0) return '0.00'
  
  if (symbol === 'ETH') {
    return num.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
  }
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function BotAssets({ botAddress, botLabel }: BotAssetsProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [totalUSD, setTotalUSD] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!botAddress) {
      setAssets([])
      setTotalUSD(0)
      return
    }

    async function fetchAssets() {
      setLoading(true)
      setError(null)
      try {
        const res = await backendApi.get(`/api/bots/assets/${botAddress}`)
        setAssets(res.data.assets || [])
        setTotalUSD(res.data.totalUSD || 0)
      } catch (err: any) {
        console.error('Failed to fetch assets:', err)
        setError(err?.response?.data?.error || 'Failed to load assets')
      } finally {
        setLoading(false)
      }
    }

    fetchAssets()
    const interval = setInterval(fetchAssets, 60000)
    return () => clearInterval(interval)
  }, [botAddress])

  if (!botAddress) return null

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-1 px-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Net Worth
          </span>
          <span className="text-[10px] bg-neon-green/10 text-neon-green px-1.5 py-0.5 rounded border border-neon-green/20 font-mono">
             LIVE
          </span>
        </div>
        <div className="text-2xl font-bold text-neon-green tracking-tight font-mono">
          ${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-xs ml-1 opacity-60">USD</span>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-1">
        {loading ? (
          <div className="px-4 py-12 text-center">
            <div className="animate-pulse text-muted-foreground text-xs font-mono">
              SCANNING CHAINS...
            </div>
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center text-destructive text-xs font-mono border border-destructive/20 bg-destructive/5 rounded">
            ERROR: {error}
          </div>
        ) : assets.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted-foreground text-xs font-mono italic opacity-50">
            NO ASSETS DETECTED IN HARVEST
          </div>
        ) : (
          assets.sort((a, b) => b.valueUSD - a.valueUSD).map((asset, i) => (
            <div 
              key={`${asset.chainId}-${asset.symbol}-${i}`} 
              className="group flex items-center justify-between px-3 py-2.5 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all bg-black/20"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-foreground border border-white/10 group-hover:border-primary/30 transition-colors">
                    {asset.symbol.slice(0, 2)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-md bg-black border border-white/20 flex items-center justify-center overflow-hidden">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary/40 shrink-0" />
                  </div>
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    {asset.symbol}
                    <span className="text-[9px] font-medium text-muted-foreground px-1 border border-white/10 rounded uppercase">
                      {CHAIN_NAMES[asset.chainId] === 'Unichain Sepolia' ? 'UNI' : 'L2'}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter opacity-70">
                    {CHAIN_NAMES[asset.chainId]?.split(' ')[0] || 'Chain'} Network
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-sm text-foreground font-bold leading-none">
                  {formatAmount(asset.amountFormatted, asset.symbol)}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-1 opacity-80">
                  ${asset.valueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
