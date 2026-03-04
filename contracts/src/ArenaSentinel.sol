// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IReactive} from "reactive-lib/interfaces/IReactive.sol";

import {
    AbstractReactive
} from "reactive-lib/abstract-base/AbstractReactive.sol";

contract ArenaSentinel is AbstractReactive {
    // --- Configuration ---
    address public constant UNICHAIN_V4_POOL_MANAGER =
        0xB65B40FC59d754Ff08Dacd0c2257F1E2a5a2eE38;
    uint256 public constant ORIGIN_CHAIN_ID = 1301; // Unichain Sepolia
    uint256 public constant DESTINATION_CHAIN_ID = 1301; // Unichain Sepolia

    // Uniswap v4 Swap Event Signature
    // event Swap(bytes32 indexed poolId, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee);
    uint256 public constant SWAP_TOPIC_0 =
        0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f;

    address public arenaHook;
    address public beneficiary; // AI Wallet that receives arb profits
    uint256 public agentId; // EIP-8004 Agent ID

    // Triggers
    struct Trigger {
        bool active;
        bool isLower; // true = trigger usage if price < limit
        uint256 limitPrice; // Simplified price rep
        uint256 orderId;
        address maker;
    }

    // Mapping L1 Pool -> Triggers (Simplified: Global list for hackathon)
    Trigger[] public triggers;

    constructor(
        address _arenaHook,
        address _beneficiary,
        uint256 _agentId,
        address // _l1Pool
    ) payable {
        arenaHook = _arenaHook;
        beneficiary = _beneficiary;
        agentId = _agentId;
        // Subscription moved to initializeSubscription() to prevent constructor failures
    }

    function initializeSubscription(address _l1Pool) external payable {
        // Just subscribe directly. System contract handles potential fees.
        service.subscribe(
            ORIGIN_CHAIN_ID,
            _l1Pool,
            SWAP_TOPIC_0,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
    }

    // --- AI Strategy Configuration (Called by backend) ---
    function addTrigger(
        uint256 orderId,
        address maker,
        uint256 limitPrice,
        bool isLower
    ) external {
        triggers.push(
            Trigger({
                active: true,
                isLower: isLower,
                limitPrice: limitPrice,
                orderId: orderId,
                maker: maker
            })
        );
    }

    // --- Reactive Loop ---
    function react(IReactive.LogRecord calldata log) external override {
        // Only care about our subscription
        if (log.chain_id != ORIGIN_CHAIN_ID || log.topic_0 != SWAP_TOPIC_0)
            return;

        // Decode V4 Swap data
        // data: int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee
        (, , uint160 sqrtPriceX96, , , ) = abi.decode(
            log.data,
            (int128, int128, uint160, uint128, int24, uint24)
        );

        uint256 sqrtQ96 = uint256(sqrtPriceX96);
        uint256 priceQ192 = sqrtQ96 * sqrtQ96;
        uint256 currentPrice = ((priceQ192 >> 96) * 1e18) >> 96; // Safe precision

        // Check triggers
        for (uint256 i = 0; i < triggers.length; i++) {
            Trigger storage t = triggers[i];
            if (!t.active) continue;

            bool hit = t.isLower
                ? (currentPrice < t.limitPrice)
                : (currentPrice > t.limitPrice);

            if (hit) {
                t.active = false; // One-shot

                // Signal L2 Hook to execute
                // Function: triggerOrder(uint256 orderId, uint256 agentId, address beneficiary)
                bytes memory payload = abi.encodeWithSignature(
                    "triggerOrder(uint256,uint256,address)",
                    t.orderId,
                    agentId,
                    beneficiary
                );

                emit Callback(DESTINATION_CHAIN_ID, arenaHook, 500000, payload);
            }
        }
    }
}
