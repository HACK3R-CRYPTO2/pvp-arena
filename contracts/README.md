# 🛡️
```text
  ___      ___     _                   
 | _ \_ _ | _ \   /_\  _ _ ___ _ _  __ _ 
 |  _/ ' \|  _/  / _ \| '_/ -_) ' \/ _` |
 |_| |_||_|_|   /_/ \_\_| \___|_||_\__,_|
```
**Smart Contract Protocol Suite**

The PvP Trading Arena protocol is a senior-grade, gas-optimized implementation of trustless agent interactions on Uniswap v4.

## 🚀 Key Contracts

### ⚔️ ArenaHook.sol (Unichain Sepolia)
The core logic engine. It manages P2P orders, AI sniping integration, and EIP-8004 reputation reporting.
- **Gas Optimized**: Uses a packed `Order` struct (4 slots) to minimize storage costs (~15% gas savings).
- **Custom Errors**: Replaces all revert strings with high-performance custom errors for dev-friendliness and efficiency.
- **Multi-Sentinel Auth**: Supports authorization of multiple independent sniping agents concurrently.
- **Expiry Guard**: Built-in protection against outdated liquidity execution.

### 🆔 AgentRegistry.sol (Unichain Sepolia)
The identity layer for AI agents.
- **NFT Identity**: Every agent is represented by a unique ID linked to their operational wallet.
- **Metadata Management**: Flexible on-chain storage for agent names and capabilities.

### 📈 AgentReputation.sol (Unichain Sepolia)
A secure implementation of the EIP-8004 reputation system.
- **Authorized Reporters**: Only verified hooks (like `ArenaHook`) can report trade outcomes.
- **Trustless History**: Provides a verifiable track record for every agent in the arena.

### 📡 ArenaSentinel.sol (Reactive Network)
The cross-chain bridge and "AI Eye".
- **L1 Monitoring**: Subscribes to Uniswap v3 events on Ethereum Layer 1.
- **Automated Trigger**: Fires cross-chain callbacks to Unichain Sepolia when market catalysts occur.

## 🛠️ Tech Stack
- **Framework**: Foundry
- **Standard**: Uniswap v4 Hooks, EIP-8004
- **Network**: Unichain Sepolia & Reactive Lasna

## 📦 Local Development

1. **Install Dependencies**:
```bash
forge install
```

2. **Run Tests**:
```bash
forge test
```

3. **Deploy (Senior Suite)**:
```bash
forge script script/DeploySenior.s.sol --rpc-url <YOUR_RPC> --broadcast
```

## 🏗️ Protocol Deployment (Current)
| Contract | Address | Network |
| :--- | :--- | :--- |
| **ArenaHook** | `0x52d3ee769225b499282e21c9582bd3ff4c426310` | Unichain Sepolia |
| **AgentRegistry** | `0x94177286736a0d8966bb0b6a8ff4587bce01d359` | Unichain Sepolia |
| **AgentReputation** | `0x38329a436f2756c388690f12398567cacd2b5d33` | Unichain Sepolia |
| **ArenaSentinel** | `0x4F47D6843095F3b53C67B02C9B72eB1d579051ba` | Reactive Lasna |
