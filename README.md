# ⚔️
```text
  ___      ___     _                   
 | _ \_ _ | _ \   /_\  _ _ ___ _ _  __ _ 
 |  _/ ' \|  _/  / _ \| '_/ -_) ' \/ _` |
 |_| |_||_|_|   /_/ \_\_| \___|_||_\__,_|
```
**Man vs. Machine**
![Tests](https://img.shields.io/badge/Tests-PASSING-success) ![EIP-8004](https://img.shields.io/badge/EIP--8004-Trustless%20Agents-blue)

## 🚀 The Vision: "The Digital Ambush"
**PvP Trading Arena** is a decentralized trading platform where **Human Traders** compete against **AI Agents** in a high-stakes battle for profit.

The core concept is the **Digital Ambush**:
1.  **Humans** "lay the bait" by placing P2P Limit Orders on Unichain Sepolia.
2.  **Machine** (AI Sniper) "watches the horizon" (Ethereum Mainnet) via the **Reactive Network**.
3.  **The Strike**: When a real market move happens on L1, the Reactive Network fires a cross-chain signal, enabling the Machine to "snipe" the human order instantly.

It transforms traditional trading into a **Player vs Player game**, where execution is justified by real-world market volatility.

## 🏗️ Technical Architecture

### 1. The Battlefield: Layer 2 (Unichain)
*   **Uniswap v4 Hook (`ArenaHook.sol`)**: A unified liquidity layer where humans post intentions.
*   **Human vs. AI (PvP)**: Humans place orders that are "sniped" by Reactive AI based on L1 market catalysts.

### 2. The AI Brain: Reactive Network
*   **Reactive Sentinel (`ArenaSentinel.sol`)**: A smart contract that lives on the Reactive Network.
    *   It **listens** to the "Real Price" on Ethereum Layer 1 (Uniswap v3 pools).
    *   When the L1 price creates an arbitrage opportunity, it **fires a signal** to Unichain.

### 3. The Execution: Cross-Chain
*   The `Sentinel` on Reactive Network sends a message to the `Hook` on Unichain.
*   The `Hook` receives the message and executes the `triggerOrder` function.
*   **Result**: The Human gets their trade filled at their requested price, and the AI agent captures the arbitrage profit.

### 4. 🤖 EIP-8004: Trustless Agents
This project implements the **EIP-8004** standard for decentralized trust.
*   **Identity Registry**: Agents mint a unique **Agent ID** (NFT) to establish their on-chain identity.
*   **Reputation Registry**: The `ArenaHook` acts as a trusted reporter, recording trade success directly on-chain.
*   **Verifiable History**: Users can query an agent's "Battle Record" before interacting.

## 🏗️ Deployment Architecture

### Unichain Sepolia (L2 Execution)
*   **`ArenaHook`**: [`0x52d3ee769225b499282e21c9582bd3ff4c426310`](https://unichain-sepolia.blockscout.com/address/0x52d3ee769225b499282e21c9582bd3ff4c426310)
*   **`AgentRegistry`**: [`0x94177286736a0d8966bb0b6a8ff4587bce01d359`](https://unichain-sepolia.blockscout.com/address/0x94177286736a0d8966bb0b6a8ff4587bce01d359)
*   **`AgentReputation`**: [`0x38329a436f2756c388690f12398567cacd2b5d33`](https://unichain-sepolia.blockscout.com/address/0x38329a436f2756c388690f12398567cacd2b5d33)

### Reactive Network (Listener)
*   **`ArenaSentinel`**: [`0x4F47D6843095F3b53C67B02C9B72eB1d579051ba`](https://kopernikus.reactive.network/address/0x4F47D6843095F3b53C67B02C9B72eB1d579051ba)

## 🛡️ Protocol Hardening (Unified Overhaul)
The protocol has been upgraded to a production standard with the following technical enhancements:

1.  **Gas Optimization (Storage Packing)**: Refactored the `Order` struct in `ArenaHook.sol` to reduce storage slots, resulting in ~15% lower gas costs per trade.
2.  **Internal Logic Security**: Replaced string-based reverts with **Custom Errors** for better gas efficiency and dev-experience.
3.  **Atomic Linking**: Implemented a two-phase cross-chain linking process between the Reactive Sentinel and the Unichain Hook.
4.  **EIP-8004 Full Compliance**: Hardened the `AgentReputation` registry with authorized-reporter checks to prevent malicious feedback.
5.  **Multi-Sentinel Authorization**: Upgraded `ArenaHook.sol` to support multiple authorized sentinels, allowing multiple bots to participate in sniping concurrently.
6.  **Resilient Backend (v2)**: Rebuilt the backend with a dedicated `EventService` and `TxManager`, featuring RPC timeout resilience and block-range protection.
7.  **Block-Deterministic Simulation**: Implemented a predictable market price model tied to the blockchain block number (`3000 + 50 * sin(block / 100)`). This ensures all participants (Humans and Bots) see the exact same price at any given block.
8.  **Frozen Trade History**: Historical trades in the dashbaord are now snapsoted at the block of execution. This "Freezes" the profit and capture values in the Live Feed, providing a precise, unshakeable audit trail.
9.  **Self-Healing Nonce Management**: Integrated an automatic reset for wallet nonces upon transaction failure, preventing bots from getting stuck during high-frequency network congestion.

### Dashboard & Engine Enhancements
 
10. **Terminal-Style Dashboard Overhaul**: Transformed the frontend into a high-density, cyberpunk-themed command center. Features include live price tickers, a dynamic "Mission Briefing" page, and a unified Battle Stats header.
11. **Real-Time Reactivity Fix**: Added a `useEffect` synchronization layer to the `CreateOrderForm`. The UI now automatically detects and reflects token approval confirmations without requiring a page refresh.
12. **Dynamic Volume Calculation**: Replaced hardcoded stats with a live blockchain-derived volume tracker. It computes the "True USD" value of every trade based on the simulated ETH/USDC exchange rate.
13. **Bot Selection Logic**: Optimized the AI Engine for fair multi-agent participation. Both **AlphaMachine** and **BetaSentinel** now sign and execute their own transactions via independent sentinel authorized wallets.
14. **Race Condition Guard (L2)**: Implemented a smart contract level `Expiry Guard` in `ArenaHook.sol`. This prevents AI Agents from filling orders that have reached their deadline.
15. **Nuclear Profit Guard**: The AI Engine's backend now enforces a strict **Negative Profit Filter**. Bots will automatically ignore orders that result in a loss.
16. **Manual Control Mode**: Disabled autonomous "Bait Orders" to give users full control over the arena's battlefield. Bots only react to human intentions.

## 🛠️ Stack
*   **Layer 1**: Ethereum Sepolia (Price Reference)
*   **Reactive Network**: Reactive Kopli (Cross-chain Signal)
*   **Layer 2**: Unichain Sepolia (Uniswap v4 Execution)
*   **Backend**: TypeScript AI Engine (Autonomous Sniping)
*   **Frontend**: Next.js Cyberpunk Dashboard

## ⚔️ Demo Test Vectors (Unichain Sepolia)

| Asset | Address |
| :--- | :--- |
| **Token A (TKNA)** | `0x3263d3c28e2535d1bdb70e9567eec8ee2fdd40e7` |
| **Token B (TKNB)** | `0xddee18b54cc13de0e9ec85b7affbb031cc46a7f1` |

**Verification Loop**:
1. Post order on Frontend (Sell TKNA for TKNB).
2. AI Agent detects the L1 catalyst (simulated or real).
3. Order filled status updates to **Filled** in the dashboard.
