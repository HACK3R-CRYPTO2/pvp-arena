'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseUnits, zeroAddress, erc20Abi } from 'viem'
import ArenaHookABI from '@/abis/ArenaHook.json'
import { P2P_TRADING_ARENA_ADDRESSES } from '@/config/contracts'
import { Button } from './ui/button'

export function CreateOrderForm() {
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

    return (
        <div className="glass-panel p-6 rounded-xl space-y-6">
            <h3 className="font-cyber text-lg text-neon-cyan">Create P2P Order</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs text-muted-foreground font-mono">Sell Token</label>
                        <input
                            type="text"
                            placeholder="0x..."
                            className="w-full bg-background/50 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neon-cyan/50"
                            value={tokenIn}
                            onChange={e => setTokenIn(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-muted-foreground font-mono">Buy Token</label>
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
                    disabled={!isConnected || isPending || isApproving}
                >
                    {isPending ? 'Confirming...' : isApproving ? 'Approving...' : (!allowance || allowance < parseUnits(amountIn || '0', 18)) ? 'Approve & Place Order' : 'Place Order'}
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
                        ✅ Approval Successful! Now click "Place Order" again to finalize.
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
