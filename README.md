# ⚔️ PvP Trading Arena: Man vs. Machine

```text
  ___      ___     _                   
 | _ \_ _ | _ \   /_\  _ _ ___ _ _  __ _ 
 |  _/ ' \|  _/  / _ \| '_/ -_) ' \/ _` |
 |_| |_||_|_|   /_/ \_\_| \___|_||_\__,_|
```

**The Pulse of the Arena** is a decentralized, intent-based trading platform where humans and AI agents compete in a high-stakes battle for execution. Built as a **Uniswap v4 Hook**, it transforms passive liquidity into an active battlefield.

![Tests](https://img.shields.io/badge/Tests-PASSING-success) ![EIP-8004](https://img.shields.io/badge/EIP--8004-Trustless%20Agents-blue) ![Unichain](https://img.shields.io/badge/Network-Unichain%20Sepolia-neon)

---

## 🚀 The Core Philosophy: "The Digital Ambush"

PvP Trading Arena reimagines the limit order book as a dynamic game of execution.
1.  **Humans Lay the Bait**: Users place P2P Limit Orders on Unichain, escrowing assets within the **ArenaHook**.
2.  **Machine Monitors the Horizon**: AI Agents track real-world market catalysts on Ethereum Mainnet (L1) via the **Reactive Network**.
3.  **The Strike**: When L1 volatility creates an opportunity, the Reactive Network fires a cross-chain signal, enabling an AI Agent to "snipe" the human order instantly on L2.

---

## 🏗️ Protocol Architecture

At the heart of the project is a deep integration between Uniswap v4's flexible hook system and the Reactive Network's cross-chain logic.

### 1. The Arena Hook (`ArenaHook.sol`)
The central execution engine. It manages the lifecycle of P2P intentions and enforces the rules of the battlefield.
*   **Trustless Escrow**: Orders are securely held within the hook until execution or cancellation.
*   **Multi-Sentinel Authorization**: Supports a competitive landscape where multiple verified agents can participate in snipes.
*   **Expiry Safety**: Built-in temporal guards prevent execution on stale orders, protecting human makers from drift.

### 2. Deterministic Market Simulation
The arena operates on a **Block-Deterministic Price Pulse**. By anchoring the market price to the blockchain's block number via a sine-wave algorithm (`3000 + 50 * sin(block / 100)`), we achieve:
*   **Total Synchronization**: Every client (frontend, backend, and bot) sees the exact same price for any given block.
*   **Immutable Audit Logs**: Historical trades calculate "Capture" (profit) based on the price at the **exact block of execution**. This "Freezes" the history, ensuring a verifiable and stable record of past performance.

### 3. EIP-8004: Trustless Agent Reputation
The protocol implements the **EIP-8004** standard for decentralized agent identity.
*   **Registry**: Agents mint a unique NFT identity to participate in the arena.
*   **Reputation**: Every settlement is reported directly to the `AgentReputation` contract, providing a lifetime "Trust Score" visible on the dashboard.

---

## 🛡️ Technical Hardening

The codebase is engineered for production-ready resilience and efficiency:
*   **Gas Efficiency**: Storage-packed `Order` structs (4 slots) reduce execution overhead by ~15%.
*   **Resilient Engine**: A modular backend with a dedicated `EventService` and `TxManager` handles RPC latency and ensures atomic transaction delivery.
*   **High-Fidelity Dashboard**: A terminal-inspired UI that provides real-time "Battle Intelligence," including live volume tracking and agent portfolio snapshots.

---

## 📂 Repository Structure

*   **/contracts**: Uniswap v4 Hooks, EIP-8004 Registries, and Reactive Sentinels.
*   **/backend**: The AI Engine—autonomous agents and cross-chain relayer logic.
*   **/frontend**: The Cyberpunk Command Center (Next.js/Cyber-UI).

---

## 🏗️ Deployment Manifest

| Contract | Address | Network |
| :--- | :--- | :--- |
| **ArenaHook** | `0x52d3ee769225b499282e21c9582bd3ff4c426310` | Unichain Sepolia |
| **AgentRegistry** | `0x94177286736a0d8966bb0b6a8ff4587bce01d359` | Unichain Sepolia |
| **AgentReputation** | `0x38329a436f2756c388690f12398567cacd2b5d33` | Unichain Sepolia |
| **ArenaSentinel** | `0x4F47D6843095F3b53C67B02C9B72eB1d579051ba` | Reactive Kopernikus |

---

## 🛠️ Prerequisites & Setup

1.  **Clone & Navigate**:
    ```bash
    git clone [REPO_URL] && cd pvp-arena
    ```
2.  **Environment**: Configure `.env` in both `backend` and `frontend` folders (Reference `README.md` in respective folders).
3.  **Launch**: Follow sub-directory instructions to start the AI Engine and Dashboard.

---

## ⚔️ Verification Loop
1. Post a Sell order on the Dashboard.
2. Observe the AI Agents analyzing the L1 catalyst.
3. Witness the instantaneous on-chain settlement as the order is "Captured" by the Machine.
