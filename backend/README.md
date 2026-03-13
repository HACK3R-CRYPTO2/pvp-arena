# 🧠 Autonomous AI Strategy Engine (Backend)

```text
  ___      ___     _                   
 | _ \_ _ | _ \   /_\  _ _ ___ _ _  __ _ 
 |  _/ ' \|  _/  / _ \| '_/ -_) ' \/ _` |
 |_| |_||_|_|   /_/ \_\_| \___|_||_\__,_|
```

The AI Engine is the autonomous brain of the PvP Trading Arena. It powers the "Snipers"—the verified AI Agents that analyze global market catalysts and execute high-precision, profitable intentions in the arena.

---

> [!NOTE]
> **Demo Reactivity**: For the live hackathon showcase, the engine is synchronized to a **Block-Deterministic V4 Pulse**. 
> **The Decision**: Real-world L1 price catalysts can be stagnant for hours. We chose not to wait for organic market drift during a short demo review. This pulse ensures the AI agents remain active, aggressive, and ready to demonstrate the "Ambush" at any moment.

---

## 🏗️ Deep Engineering Architecture

The backend is built as a high-performance repository of decoupled micro-services, engineered for atomic safety and maximum execution uptime.

### 1. Deterministic Market Simulation (`StrategyService.ts`)
The Arena operates on a **Block-Deterministic Price Pulse**. This ensures that the simulated market price is not an arbitrary number, but a verifiable state tied directly to the blockchain.
*   **Mathematical Pulse**: `3000 + 50 * sin(blockNumber / 100)`. 
    *   **Baseline (3000)**: The anchor price for the simulation. This "Arena Hearthstone" ensures that the trading dashboard remains locally active and "snipable" even if L1 markets are stagnant.
    *   **Amplitude (50)**: Defines the volatility range ($2,950 to $3,050).
    *   **Period (100)**: Spread over 100 blocks. On Unichain (1s blocks), this creates a cyclic price oscillation every ~1.6 minutes, providing high-frequency sniping opportunities.
*   **Total Client Synchronization**: By deriving the price algorithmically from the block height, the Backend, Frontend, and Reactive Sentinels are in 100% mathematical lock-step.
*   **Nuclear Profit Guard**: Every captured order is passed through a strict profit validator. The engine balances the **L1 Target Price** (simulated) against the **L2 MinOut** (human intent) plus gas overhead. If the net P&L is ≤ 0, the "Nuclear Guard" enforces an atomic skip, protecting the AI agent's treasury from toxic trades.

### 2. Resilient Transaction Orchestration (`TxManager.ts`)
A specialized execution layer designed for high-frequency settlement on **Unichain Sepolia**.
*   **Self-Healing Nonce Management**: The engine automatically detects and resolves nonce-out-of-sync errors caused by RPC lag or network congestion. It performs a "Self-Healing sync" with the blockchain state before every execution strike.
*   **Atomic Queuing**: Prevents transaction collisions, allowing a single agent to fire multiple independent snipes without causing on-chain reverts.

### 3. High-Fidelity Event Polling (`EventService.ts`)
The `EventService` is a resilient listener designed for stable monitoring of the Uniswap v4 Hook.
*   **Filter Persistence**: Built-in recovery for RPC "Filter not found" or "Timeout" errors.
*   **Infinite Scanning Loop**: If the connection drops, the service performs a recursive block-range scan upon reconnection to ensure that every human "Bait" (order) is indexed and analyzed.

---

## 🛠️ Technical Manifest

### 🌐 Unichain Sepolia (Chain ID: 1301)
*   **ArenaHook (V4)**: `0x52d3ee769225b499282e21c9582bd3ff4c426310`
*   **AgentRegistry**: `0x94177286736a0d8966bb0b6a8ff4587bce01d359`
*   **Mock Token A (TKNA)**: `0x3263d3c28e2535d1bdb70e9567eec8ee2fdd40e7`
*   **Mock Token B (TKNB)**: `0xddee18b54cc13de0e9ec85b7affbb031cc46a7f1`

### 🌐 Ethereum Mainnet (L1 Reference)
*   **ETH/USDC (v3)**: `0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640`

---

## 🛠️ Technical Stack
*   **Runtime**: Node.js v20+ / TypeScript
*   **Web3 Library**: `ethers.js` (v6) with custom RPC provider management.
*   **Security**: Dedicated EIP-8004 identity verification layer.

---

## 📦 Local Setup
1. `npm install`
2. Configure `.env` (L2_RPC_URL, L2_HOOK_ADDRESS, PRIVATE_KEY)
3. `npm start`
