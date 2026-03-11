# 🧠
```text
  ___      ___     _                   
 | _ \_ _ | _ \   /_\  _ _ ___ _ _  __ _ 
 |  _/ ' \|  _/  / _ \| '_/ -_) ' \/ _` |
 |_| |_||_|_|   /_/ \_\_| \___|_||_\__,_|
```
**Backend AI Engine**

The AI Engine is responsible for the autonomous "Sniping" logic that powers the PvP Trading Arena. It monitors Unichain for human intentions and reacts to L1 market catalysts.

## 🚀 Features
- **Bot Orchestration**: Manages `AlphaMachine` (Market Maker) and `BetaSentinel` (The Sniper).
- **Event Listening**: Watches for `OrderPosted` events on the `ArenaHook`.
- **L1 Simulation/Real-Time Monitoring**: Simulates or monitors L1 signals via the Reactive Network.
- **Autonomous Execution**: Automatically triggers orders on-chain when arbitrage conditions are met.

## 🛠️ Stack
- **Runtime**: Node.js
- **Language**: TypeScript
- **Library**: `ethers.js` (v6)

## 📦 Setup & Run

1.  **Configure Environment**:
    Create a `.env` file with the following:
    ```env
    L2_RPC_URL=https://unichain-sepolia-rpc.publicnode.com
    L2_HOOK_ADDRESS=0x7f927a09915a582Ce3142bB9D8527D0Aa7aee93C
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
- `src/services/arena.ts`: Core sniping and event handling logic.
- `src/services/bots.ts`: Multi-agent management and wallet handling.
- `src/abi/`: Contains synchronized ABIs for the ArenaHook.
