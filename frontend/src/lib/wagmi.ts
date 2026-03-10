/**
 * Wagmi Configuration
 * 
 * Uses NEXT_PUBLIC_ENS_MAINNET to toggle between mainnet and Sepolia.
 */
import { http, createConfig } from 'wagmi'
import { sepolia, mainnet } from 'wagmi/chains'
import { defineChain } from 'viem'

const unichainSepolia = defineChain({
  id: 1301,
  name: 'Unichain Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://unichain-sepolia-rpc.publicnode.com'] }, // Or your specific RPC
  },
  blockExplorers: {
    default: { name: 'Unichain Explorer', url: 'https://unichain-sepolia.blockscout.com/' }, // Example explorer
  },
  testnet: true,
})

const reactiveLasna = defineChain({
  id: 5318007,
  name: 'Reactive Lasna',
  nativeCurrency: {
    decimals: 18,
    name: 'lREACT',
    symbol: 'lREACT',
  },
  rpcUrls: {
    default: { http: ['https://lasna-rpc.rnk.dev/'] },
  },
  blockExplorers: {
    default: { name: 'Reactive Explorer', url: 'https://lasna.reactscan.net' },
  },
  testnet: true,
})

const IS_MAINNET = process.env.NEXT_PUBLIC_ENS_MAINNET === 'true'

export const ensChainId = IS_MAINNET ? mainnet.id : sepolia.id

export const wagmiConfig = createConfig({
  chains: [unichainSepolia, reactiveLasna, sepolia, mainnet],
  transports: {
    [unichainSepolia.id]: http('https://unichain-sepolia-rpc.publicnode.com'),
    [reactiveLasna.id]: http('https://lasna-rpc.rnk.dev/'),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org'),
    [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://eth.llamarpc.com'),
  },
  ssr: true,
})
