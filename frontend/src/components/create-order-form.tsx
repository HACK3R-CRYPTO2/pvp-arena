'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseUnits, zeroAddress, erc20Abi } from 'viem'
import ArenaHookABI from '@/abis/ArenaHook.json'
import { P2P_TRADING_ARENA_ADDRESSES } from '@/config/contracts'
import { Button } from './ui/button'

interface CreateOrderFormProps {
    variant?: 'default' | 'wide' | 'compact'
}

const TKNA_ADDR = '0x3263d3c28e2535d1bdb70e9567eec8ee2fdd40e7'
const TKNB_ADDR = '0xddee18b54cc13de0e9ec85b7affbb031cc46a7f1'

export function CreateOrderForm({ variant = 'default' }: CreateOrderFormProps) {
    const { address, isConnected } = useAccount()
    const { writeContract, data: hash, error: writeError, isPending } = useWriteContract()
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    })

    const [lastTxType, setLastTxType] = useState<'approve' | 'order' | null>(null)

    // Form State
    const [tokenIn, setTokenIn] = useState('')
    const [tokenOut, setTokenOut] = useState('')
    const [amountIn, setAmountIn] = useState('')
    const [minAmountOut, setMinAmountOut] = useState('')
    const [duration, setDuration] = useState('3600') // 1 hour default
    const [isApproving, setIsApproving] = useState(false)

    // Check allowance for tokenIn
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: tokenIn as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: address ? [address, P2P_TRADING_ARENA_ADDRESSES.ArenaHook as `0x${string}`] : undefined,
        query: { enabled: !!address && !!tokenIn && tokenIn.startsWith('0x') }
    })

    // Automatically refetch allowance when a transaction confirms
    useEffect(() => {
        if (isConfirmed && (lastTxType === 'approve' || lastTxType === 'order')) {
            refetchAllowance()
        }
    }, [isConfirmed, lastTxType, refetchAllowance])

    let needsApproval = false;
    try {
        if (tokenIn && tokenIn.startsWith('0x') && amountIn && Number(amountIn) > 0) {
             needsApproval = !allowance || allowance < parseUnits(amountIn, 18);
        }
    } catch(e) {}

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!tokenIn || !tokenOut || !amountIn || !minAmountOut) return

        try {
            const amountInWei = parseUnits(amountIn, 18)
            const minAmountOutWei = parseUnits(minAmountOut, 18)

            // 0. Check Approval
            if (!allowance || allowance < amountInWei) {
                setIsApproving(true)
                setLastTxType('approve')
                try {
                    writeContract({
                        address: tokenIn as `0x${string}`,
                        abi: erc20Abi,
                        functionName: 'approve',
                        args: [P2P_TRADING_ARENA_ADDRESSES.ArenaHook as `0x${string}`, amountInWei],
                    })
                    return
                } finally {
                    setIsApproving(false)
                }
            }

            // 1. Sort tokens...
            setLastTxType('order')
            const token0 = tokenIn.toLowerCase() < tokenOut.toLowerCase() ? tokenIn : tokenOut
            const token1 = tokenIn.toLowerCase() < tokenOut.toLowerCase() ? tokenOut : tokenIn
            const sellToken0 = tokenIn.toLowerCase() === token0.toLowerCase()

            // 2. Construct PoolKey...
            const poolKey = {
                currency0: token0,
                currency1: token1,
                fee: 3000,
                tickSpacing: 60,
                hooks: P2P_TRADING_ARENA_ADDRESSES.ArenaHook
            }

            // 3. Call postOrder
            writeContract({
                address: P2P_TRADING_ARENA_ADDRESSES.ArenaHook as `0x${string}`,
                abi: (ArenaHookABI as any).abi || ArenaHookABI,
                functionName: 'postOrder',
                args: [
                    poolKey,
                    sellToken0,
                    amountInWei,
                    minAmountOutWei,
                    BigInt(duration)
                ],
            })

        } catch (err) {
            console.error("Order creation failed", err)
        }
    }

    if (variant === 'compact') {
        return (
            <div className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[9px] text-muted-foreground font-cyber uppercase tracking-widest text-neon-purple/80">Target Assets</label>
                            <div className="flex gap-1">
                                <button type="button" onClick={() => setTokenIn(TKNA_ADDR)} className="text-[8px] bg-white/5 hover:bg-white/10 border border-white/10 px-1 rounded transition-colors text-muted-foreground hover:text-white uppercase font-mono">TKNA</button>
                                <button type="button" onClick={() => setTokenIn(TKNB_ADDR)} className="text-[8px] bg-white/5 hover:bg-white/10 border border-white/10 px-1 rounded transition-colors text-muted-foreground hover:text-white uppercase font-mono">TKNB</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="text"
                                placeholder="Sell 0x..."
                                className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-1.5 text-[10px] font-mono focus:border-neon-purple/50 outline-none placeholder:opacity-30"
                                value={tokenIn}
                                onChange={e => setTokenIn(e.target.value)}
                            />
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Buy 0x..."
                                    className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-1.5 text-[10px] font-mono focus:border-neon-purple/50 outline-none placeholder:opacity-30"
                                    value={tokenOut}
                                    onChange={e => setTokenOut(e.target.value)}
                                />
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 bg-black/40 p-0.5 rounded backdrop-blur-sm border border-white/5">
                                    <button type="button" onClick={() => setTokenOut(TKNA_ADDR)} className="text-[7px] text-muted-foreground hover:text-white uppercase font-bold px-0.5 transition-colors">A</button>
                                    <button type="button" onClick={() => setTokenOut(TKNB_ADDR)} className="text-[7px] text-muted-foreground hover:text-white uppercase font-bold px-0.5 transition-colors">B</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-[8px] text-muted-foreground font-mono uppercase">Amount In</label>
                            <input
                                type="text"
                                placeholder="0.0"
                                className="w-full bg-black/40 border border-white/5 rounded-md px-2 py-1.5 text-[10px] font-mono focus:border-neon-purple/50 outline-none"
                                value={amountIn}
                                onChange={e => setAmountIn(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[8px] text-muted-foreground font-mono uppercase">Min Out</label>
                            <input
                                type="text"
                                placeholder="0.0"
                                className="w-full bg-black/40 border border-white/5 rounded-md px-2 py-1.5 text-[10px] font-mono focus:border-neon-purple/50 outline-none"
                                value={minAmountOut}
                                onChange={e => setMinAmountOut(e.target.value)}
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-neon-purple/20 hover:bg-neon-purple/30 text-neon-purple border border-neon-purple/40 font-cyber text-[10px] tracking-[0.2em] h-8"
                        disabled={!isConnected || isPending || isConfirming || isApproving}
                    >
                        {isPending || isConfirming ? 'SYNCING...' : needsApproval ? 'AUTHORIZE' : 'INITIATE ATTACK'}
                    </Button>

                    {(hash || isConfirmed || writeError) && (
                        <div className="pt-2 border-t border-white/5">
                            {isConfirmed ? (
                                lastTxType === 'order' ? (
                                    <p className="text-[8px] text-neon-green font-bold uppercase tracking-widest text-center animate-pulse">
                                        ⚔️ LOGGED: Target neutralized
                                    </p>
                                ) : (
                                    <p className="text-[8px] text-neon-cyan font-bold uppercase tracking-widest text-center animate-pulse">
                                        ✅ Authorization confirmed
                                    </p>
                                )
                            ) : writeError ? (
                                <p className="text-[8px] text-red-400 font-mono text-center wrap-break-word">
                                    ERR: {writeError.message.slice(0, 40)}...
                                </p>
                            ) : hash ? (
                                <p className="text-[8px] text-muted-foreground font-mono text-center">
                                    TX: {hash.slice(0, 12)}...
                                </p>
                            ) : null}
                        </div>
                    )}
                </form>
            </div>
        )
    }

    if (variant === 'wide') {
        return (
            <div className="glass-panel p-6 rounded-2xl border border-neon-cyan/10 bg-linear-to-r from-neon-cyan/[0.02] to-transparent">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
                    <div>
                        <h3 className="font-cyber text-lg text-white flex items-center gap-2">
                             Deploy Target Bait
                        </h3>
                        <p className="text-xs text-muted-foreground">Post a P2P order to Unichain Sepolia</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="md:col-span-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] text-muted-foreground font-cyber uppercase">Sell</label>
                            <div className="flex gap-1">
                                <button type="button" onClick={() => setTokenIn(TKNA_ADDR)} className="text-[8px] text-muted-foreground hover:text-neon-cyan transition-colors uppercase font-mono">TKNA</button>
                                <button type="button" onClick={() => setTokenIn(TKNB_ADDR)} className="text-[8px] text-muted-foreground hover:text-neon-cyan transition-colors uppercase font-mono">TKNB</button>
                            </div>
                        </div>
                        <input
                            type="text"
                            placeholder="0x..."
                            className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs font-mono focus:border-neon-cyan/50 outline-none"
                            value={tokenIn}
                            onChange={e => setTokenIn(e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] text-muted-foreground font-cyber uppercase">Buy</label>
                            <div className="flex gap-1">
                                <button type="button" onClick={() => setTokenOut(TKNA_ADDR)} className="text-[8px] text-muted-foreground hover:text-neon-cyan transition-colors uppercase font-mono">TKNA</button>
                                <button type="button" onClick={() => setTokenOut(TKNB_ADDR)} className="text-[8px] text-muted-foreground hover:text-neon-cyan transition-colors uppercase font-mono">TKNB</button>
                            </div>
                        </div>
                        <input
                            type="text"
                            placeholder="0x..."
                            className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs font-mono focus:border-neon-cyan/50 outline-none"
                            value={tokenOut}
                            onChange={e => setTokenOut(e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-1 space-y-1.5">
                        <label className="text-[10px] text-muted-foreground font-cyber uppercase">Amount</label>
                        <input
                            type="text"
                            placeholder="0.0"
                            className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs font-mono focus:border-neon-cyan/50 outline-none"
                            value={amountIn}
                            onChange={e => setAmountIn(e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-1 space-y-1.5">
                        <label className="text-[10px] text-muted-foreground font-cyber uppercase">Min Out</label>
                        <input
                            type="text"
                            placeholder="0.0"
                            className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs font-mono focus:border-neon-cyan/50 outline-none"
                            value={minAmountOut}
                            onChange={e => setMinAmountOut(e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-1 space-y-1.5">
                        <label className="text-[10px] text-muted-foreground font-cyber uppercase">TTL (Sec)</label>
                        <input
                            type="number"
                            placeholder="3600"
                            className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs font-mono focus:border-neon-cyan/50 outline-none"
                            value={duration}
                            onChange={e => setDuration(e.target.value)}
                        />
                    </div>
                    
                    <div className="md:col-span-1">
                        <Button
                            type="submit"
                            className="w-full bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/40 font-cyber text-xs tracking-wider"
                            disabled={!isConnected || isPending || isConfirming || isApproving}
                        >
                            {isPending || isConfirming ? 'SYNCING...' : needsApproval ? 'APPROVE' : 'DEPLOY'}
                        </Button>
                    </div>

                    {/* Status/Receipt Overlay (Integrated) */}
                    {(hash || isConfirmed || writeError) && (
                         <div className="md:col-span-6 mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                            <div className="flex gap-4">
                                {hash && (
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                        TX: <a href={`https://unichain-sepolia.blockscout.com/tx/${hash}`} target="_blank" className="text-neon-cyan underline">{hash.slice(0, 10)}...</a>
                                    </span>
                                )}
                                {isConfirmed && lastTxType === 'order' && (
                                    <span className="text-[10px] text-neon-green font-bold uppercase tracking-widest animate-pulse">
                                        ⚔️ Target Neutralized
                                    </span>
                                )}
                                {isConfirmed && lastTxType === 'approve' && (
                                    <span className="text-[10px] text-neon-cyan font-bold uppercase tracking-widest animate-pulse">
                                        ✅ Authorization Ready
                                    </span>
                                )}
                            </div>
                            {writeError && (
                                <span className="text-[10px] text-red-400 font-mono">FAIL: {writeError.message.slice(0, 30)}...</span>
                            )}
                         </div>
                    )}
                </form>
            </div>
        )
    }

    return (
        <div className="glass-panel p-6 rounded-xl space-y-6">
            <h3 className="font-cyber text-lg text-neon-cyan">Create P2P Order</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs text-muted-foreground font-mono">Sell Token</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setTokenIn(TKNA_ADDR)} className="text-[10px] text-neon-cyan hover:underline font-mono">TKNA</button>
                                <button type="button" onClick={() => setTokenIn(TKNB_ADDR)} className="text-[10px] text-neon-cyan hover:underline font-mono">TKNB</button>
                            </div>
                        </div>
                        <input
                            type="text"
                            placeholder="0x..."
                            className="w-full bg-background/50 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neon-cyan/50"
                            value={tokenIn}
                            onChange={e => setTokenIn(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs text-muted-foreground font-mono">Buy Token</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setTokenOut(TKNA_ADDR)} className="text-[10px] text-neon-cyan hover:underline font-mono">TKNA</button>
                                <button type="button" onClick={() => setTokenOut(TKNB_ADDR)} className="text-[10px] text-neon-cyan hover:underline font-mono">TKNB</button>
                            </div>
                        </div>
                        <input
                            type="text"
                            placeholder="0x..."
                            className="w-full bg-background/50 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neon-cyan/50"
                            value={tokenOut}
                            onChange={e => setTokenOut(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs text-muted-foreground font-mono">Amount In</label>
                        <input
                            type="text"
                            placeholder="0.0"
                            className="w-full bg-background/50 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neon-cyan/50"
                            value={amountIn}
                            onChange={e => setAmountIn(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-muted-foreground font-mono">Min Out</label>
                        <input
                            type="text"
                            placeholder="0.0"
                            className="w-full bg-background/50 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neon-cyan/50"
                            value={minAmountOut}
                            onChange={e => setMinAmountOut(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-mono">Duration (seconds)</label>
                    <input
                        type="number"
                        placeholder="3600"
                        className="w-full bg-background/50 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neon-cyan/50"
                        value={duration}
                        onChange={e => setDuration(e.target.value)}
                    />
                </div>

                <Button
                    type="submit"
                    className="w-full bg-neon-cyan/10 hover:bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 mt-4"
                    disabled={!isConnected || isPending || isConfirming || isApproving}
                >
                    {isPending || isConfirming ? 'Confirming...' : needsApproval ? 'Approve & Place Order' : 'Place Order'}
                </Button>

                {hash && (
                    <div className="mt-2 text-xs text-muted-foreground break-all">
                        {lastTxType === 'approve' ? 'Approval' : 'Order'} Tx: <a
                            href={`https://unichain-sepolia.blockscout.com/tx/${hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neon-cyan hover:underline"
                        >
                            {hash}
                        </a>
                    </div>
                )}
                {isConfirmed && lastTxType === 'approve' && (
                    <div className="text-xs text-amber-500 mt-2 font-semibold">
                        ✅ Approval Successful! Now click &quot;Place Order&quot; again to finalize.
                    </div>
                )}
                {isConfirmed && lastTxType === 'order' && (
                    <div className="text-xs text-green-500 mt-2 font-bold cyber-glitch-text">
                        ⚔️ ORDER POSTED! The Machine has been alerted.
                    </div>
                )}
                {writeError && (
                    <div className="text-xs text-red-500 mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
                        Oops: {writeError.message.slice(0, 100)}...
                    </div>
                )}
            </form>
        </div>
    )
}
