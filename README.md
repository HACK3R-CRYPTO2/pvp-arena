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
*   **`ArenaHook`**: `0x7f927a09915a582Ce3142bB9D8527D0Aa7aee93C` (v2 - Hardened)
*   **`AgentRegistry`**: `0x9db5a15aefec199b718fa4f9c8aec126ba2f9d29`
*   **`AgentReputation`**: `0xe6cabd7dbab3ee8cff6206c378fa73c99893af23`

### Reactive Network (Listener)
*   **`ArenaSentinel`**: `0xb8d533dD3c8fBE2B7cA394B9C3164a14D362Cf4d`

## 🛡️ Recent Enhancements (Hookathon Final Phase)
We have hardened the Arena for high-stakes competition with the following features:

1.  **Terminal-Style Dashboard Overhaul**: Transformed the frontend into a high-density, cyberpunk-themed command center. Features include live price tickers, a dynamic "Mission Briefing" page, and a unified Battle Stats header.
2.  **Real-Time Reactivity Fix**: Added a `useEffect` synchronization layer to the `CreateOrderForm`. The UI now automatically detects and reflects token approval confirmations without requiring a page refresh.
3.  **Dynamic Volume Calculation**: Replaced hardcoded stats with a live blockchain-derived volume tracker. It computes the "True USD" value of every trade based on the simulated ETH/USDC exchange rate.
4.  **Bot Selection Randomizer**: Optimized the AI Engine to use a fair coin-flip logic for sniping. Both **AlphaMachine** and **BetaSentinel** now compete fairly, signing and executing their own transactions.
5.  **Race Condition Guard (L2)**: Implemented a smart contract level `Expiry Guard` in `ArenaHook.sol`. This prevents AI Agents from filling orders that have reached their deadline.
6.  **Nuclear Profit Guard**: The AI Engine's backend now enforces a strict **Negative Profit Filter**. Bots will automatically ignore orders that result in a loss.
7.  **TypeScript Hardening**: Refactored the `ArenaService` backend to ensure 100% uptime during high-frequency volatility analysis.

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
