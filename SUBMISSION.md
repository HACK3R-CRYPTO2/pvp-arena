# 🏆 PvP Trading Arena: Hookathon Submission

## ⚔️ Project: Man vs. Machine

**Project Description**
PvP Trading Arena is a "Man-vs-Machine" P2P orderbook built with a Uniswap v4 Hook on Unichain. Human traders post passive limit orders (intentions) into the Hook. Trustless AI Agents—verified via an EIP-8004 Identity and Reputation Registry—act as dynamic liquidity providers. These agents monitor real-world L1 market catalysts via the Reactive Network and "snipe" human orders on L2 exactly when cross-chain conditions present a profitable, fair execution.

---

## 🚀 Technical Achievements

### 1. Block-Deterministic Market Pulse
We replaced unstable random price drift with a blockchain-anchored sine wave simulation. By tying the ETH price to the block number (`3000 + 50 * sin(block / 100)`), we synchronized the "Machine" (Backend) and "Man" (Frontend) with 100% mathematical precision. This ensures that every participant sees the exact same price for any given block.

### 2. Frozen History Architecture
We implemented an immutable snapshot pricing mechanism for the Live Feed. Completed trades now calculate profit using the price at the **exact block of execution**, "freezing" the P&L as a permanent, auditable record that never fluctuates with later market moves.

### 3. High-Fidelity Volume Intel
The dashboard HUD features a live blockchain-derived volume tracker. It computes the "True USD" value of every escrowed asset in the Hook based on the simulated exchange rate, providing professional-grade market depth visualization.

### 4. Multi-Sentinel Battle Protocol
Upgraded `ArenaHook.sol` to support simultaneous authorization of multiple independent sniping agents. This enabled a truly competitive landscape where both `AlphaMachine` and `BetaSentinel` participate in the arena as distinct on-chain identities.

### 5. Self-Healing AI Engine
Integrated autonomous nonce management and RPC resiliency into the backend `TxManager`. The engine now automatically heals and re-syncs during network congestion, ensuring 100% execution uptime for the sniping bots.

### 6. State-Polling Reputation (EIP-8004)
Solved the "disappearing history" issue found in public RPCs by implementing a custom State-Polling API. Instead of querying brittle logs, the frontend now pulls direct, lifetime truth from the contract state, ensuring Trust Scores are persistent and 100% accurate.

---

## 🏗️ Protocol Deployment

| Contract | Address | Network |
| :--- | :--- | :--- |
| **ArenaHook** | `0x52d3ee769225b499282e21c9582bd3ff4c426310` | Unichain Sepolia |
| **AgentRegistry** | `0x94177286736a0d8966bb0b6a8ff4587bce01d359` | Unichain Sepolia |
| **AgentReputation** | `0x38329a436f2756c388690f12398567cacd2b5d33` | Unichain Sepolia |
| **ArenaSentinel** | `0x4F47D6843095F3b53C67B02C9B72eB1d579051ba` | Reactive Kopernikus |

---

## ✅ Progress Metrics
- **Market Pulse Synchronization**: Verified (100% Block-Deterministic Accuracy)
- **Trade History Integrity**: Frozen (Immutable Block-Snapshot P&L)
- **Reputation Longevity**: Verified (Direct State-Polling Architecture)
- **API Throughput**: Optimized (Parallel Blockchain Sync)
- **UX/Aesthetics**: Cyberpunk High-Density Dashboard

---

## 🛡️ Sponsors Integrated
- [x] **Reactive Network**: Cross-chain L1 -> L2 Autonomous triggers.
- [x] **Unichain**: Low-latency battlefield for P2P order execution.
- [x] **Uniswap v4**: Core Hook infrastructure for intent-based trading.
