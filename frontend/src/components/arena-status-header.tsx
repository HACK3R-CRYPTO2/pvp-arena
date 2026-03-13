'use client'

import { useReadContract } from 'wagmi'
import { P2P_TRADING_ARENA_ADDRESSES } from '@/config/contracts'
import ArenaHookABI from '@/abis/ArenaHook.json'

export function ArenaStatusHeader() {
  const { data: nextOrderId } = useReadContract({
    address: P2P_TRADING_ARENA_ADDRESSES.ArenaHook as `0x${string}`,
    abi: (ArenaHookABI as any).abi || ArenaHookABI,
    functionName: 'nextOrderId',
    query: {
      refetchInterval: 5000
    }
  })

  return (
    <div className="flex items-center gap-6 px-4 py-1.5 bg-black/40 border border-white/5 rounded-full backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-cyber text-muted-foreground uppercase tracking-widest">Active Hook:</span>
        <span className="text-[10px] font-mono text-neon-cyan/80 truncate max-w-[120px]" title={P2P_TRADING_ARENA_ADDRESSES.ArenaHook}>
          {P2P_TRADING_ARENA_ADDRESSES.ArenaHook.slice(0, 6)}...{P2P_TRADING_ARENA_ADDRESSES.ArenaHook.slice(-4)}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
        <span className="text-[8px] font-cyber text-neon-cyan/60 uppercase tracking-tighter">Syncing</span>
      </div>
    </div>
  )
}
