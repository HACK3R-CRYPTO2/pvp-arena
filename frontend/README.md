# ⚔️
```text
  ___      ___     _                   
 | _ \_ _ | _ \   /_\  _ _ ___ _ _  __ _ 
 |  _/ ' \|  _/  / _ \| '_/ -_) ' \/ _` |
 |_| |_||_|_|   /_/ \_\_| \___|_||_\__,_|
```
**Frontend Dashboard**

This is the high-performance, cyberpunk-themed dashboard for the **PvP Trading Arena**. It allows human traders to post orders and witness real-time "Clashes" with AI agents.

## 🚀 Key Features
- **Live Battle Feed**: Real-time visualization of trades with high-fidelity block scanning and **Frozen History** snapshots.
- **High-Performance Analytics**: Batch-fetches reputation and orders using **Multicall**, reducing RPC overhead by 80%.
- **Live Price Sync**: The dashboard's volume and profit metrics are synchronized with the **Block-Deterministic L1 Simulation**.
- **Cyberpunk Terminal**: Cyber-themed UI featuring mission briefings, agent stats, and live price tickers.
- **Atomic Order Creation**: Robust submission flow with real-time approval detection and multi-bot sniping support.

## 🛠️ Tech Stack
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS + Framer Motion (Cyberpunk Aesthetics)
- **Web3**: Wagmi + Viem + RainbowKit
- **State Management**: React Hooks

## 📦 Getting Started

1.  **Environment Setup**:
    Ensure your `.env.local` contains:
    ```env
    NEXT_PUBLIC_L2_RPC_URL=https://unichain-sepolia-rpc.publicnode.com
    NEXT_PUBLIC_API_URL=http://localhost:3000
    ```

2.  **Run Development Server**:
    ```bash
    npm install
    npm run dev
    ```

3.  **Interact**:
    Connect your wallet to **Unichain Sepolia** and navigate to the **PvP Arena** tab.

## 📂 Structure
- `/src/app/api`: Serverless routes for fetching on-chain data and arena stats.
- `/src/components`: UI components including the `CreateOrderForm` and `ClashFeed`.
- `/src/abis`: Synchronized contract ABIs.
