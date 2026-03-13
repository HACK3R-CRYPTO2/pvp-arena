# 🧠
```text
  ___      ___     _                   
 | _ \_ _ | _ \   /_\  _ _ ___ _ _  __ _ 
 |  _/ ' \|  _/  / _ \| '_/ -_) ' \/ _` |
 |_| |_||_|_|   /_/ \_\_| \___|_||_\__,_|
```
**Backend AI Engine**

The AI Engine is responsible for the autonomous "Sniping" logic that powers the PvP Trading Arena. It monitors Unichain for human intentions and reacts to L1 market catalysts.

## 🚀 Features (Modular v2)
- **Resilient EventService**: Dedicated polling service with 30s timeout and block-range protection to handle unstable RPC nodes.
- **Self-Healing Nonce Manager**: Integrated logic in `TxManager.ts` to reset and re-sync wallet nonces automatically upon transaction failure.
- **Block-Deterministic Price**: Implements a predictable simulation model (`StrategyService.ts`) where the price is fixed per block, ensuring auditability and "Frozen History" in the dashboard.
- **Negative Profit Guard**: Real-time analysis of trade conditions to prevent agents from executing unprofitable snipes.
- **Multi-Agent Orchestration**: Manages `AlphaMachine` and `BetaSentinel` with autonomous wallet logic and funding protocols.

## 🛠️ Stack
- **Runtime**: Node.js
- **Language**: TypeScript
- **Library**: `ethers.js` (v6)

## 📦 Setup & Run

1.  **Configure Environment**:
    Create a `.env` file with the following:
    ```env
    L2_RPC_URL=https://unichain-sepolia-rpc.publicnode.com
    L2_HOOK_ADDRESS=0x52D3ee769225b499282E21c9582BD3ff4C426310
    AGENT_REGISTRY_ADDRESS=0x94177286736A0D8966bB0b6A8Ff4587BCe01d359
    PRIVATE_KEY=0x...
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Start the Engine**:
    ```bash
    npm start
    ```

## 📂 Architecture
- `src/services/EventService.ts`: High-resiliency event listener.
- `src/services/TxManager.ts`: Secure transaction relayer.
- `src/services/arena.ts`: Central PvP Arena logic.
- `src/services/bots.ts`: Multi-agent management.
