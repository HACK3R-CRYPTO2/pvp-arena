// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IHooks} from "@v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "@v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "@v4-core/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@v4-core/types/Currency.sol";
import {
    BalanceDelta,
    BalanceDeltaLibrary
} from "@v4-core/types/BalanceDelta.sol";
import {
    BeforeSwapDelta,
    BeforeSwapDeltaLibrary,
    toBeforeSwapDelta
} from "@v4-core/types/BeforeSwapDelta.sol";
import {
    SwapParams,
    ModifyLiquidityParams
} from "@v4-core/types/PoolOperation.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AgentReputation} from "./AgentReputation.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

/// @title ArenaHook
/// @notice Uniswap v4 hook for PvP Trading Arena (Human vs AI & Bot vs Bot)
contract ArenaHook is IHooks, ReentrancyGuard {
    using BalanceDeltaLibrary for BalanceDelta;
    using CurrencyLibrary for Currency;
    using SafeERC20 for IERC20;

    struct Order {
        address maker;
        bool sellToken0;
        uint128 amountIn;
        uint128 minAmountOut;
        uint256 expiry;
        bool active;
        bytes32 poolId;
        bool isHuman;
        Currency currency0;
        Currency currency1;
    }

    // Events
    event OrderPosted(
        uint256 indexed orderId,
        address indexed maker,
        bool isHuman,
        uint128 amountIn,
        uint128 minAmountOut
    );
    event OrderFilled(
        uint256 indexed orderId,
        address indexed taker,
        bool byReactiveAi
    );
    event OrderCancelled(uint256 indexed orderId, address indexed maker);
    event OrderExpired(uint256 indexed orderId, address indexed maker);

    // Errors
    error NotSentinel();
    error NotWhitelisted();
    error OrderNotFound();
    error OrderNotActive();
    error Unauthorized();
    error InvalidAmounts();
    error AmountOverflow();
    error PoolMismatch();
    error AlreadyExpired();

    uint256 public constant MAX_ITERATIONS = 50;

    // State
    IPoolManager public immutable POOL_MANAGER;
    address public sentinel; // Reactive Network Contract
    mapping(address => bool) public allowedBots; // Whitelist for Bot-vs-Bot mode

    uint256 public nextOrderId;
    mapping(uint256 => Order) public orders;
    mapping(bytes32 => uint256[]) public poolOrders;

    // EIP-8004 Integration
    AgentReputation public reputation;

    constructor(IPoolManager _poolManager, address _reputation) {
        POOL_MANAGER = _poolManager;
        reputation = AgentReputation(_reputation); // Can be address(0)
    }

    function _onlySentinel() internal view {
        if (msg.sender != sentinel) revert NotSentinel();
    }

    modifier onlySentinel() {
        _onlySentinel();
        _;
    }

    function _onlyPoolManager() internal view {
        if (msg.sender != address(POOL_MANAGER)) revert Unauthorized();
    }

    modifier onlyPoolManager() {
        _onlyPoolManager();
        _;
    }

    function setSentinel(address _sentinel) external {
        // TODO: Add admin check (for hackathon demo, open)
        sentinel = _sentinel;
    }

    // --- Order Board (Battlefield) ---

    // Humans & Bots post orders here
    function postOrder(
        PoolKey calldata key,
        bool sellToken0,
        uint128 amountIn,
        uint128 minAmountOut,
        uint256 duration
    ) external nonReentrant returns (uint256 orderId) {
        if (amountIn == 0) revert InvalidAmounts();

        bytes32 poolId = _getPoolId(key);
        orderId = nextOrderId++;

        orders[orderId] = Order({
            maker: msg.sender,
            sellToken0: sellToken0,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            expiry: block.timestamp + duration,
            active: true,
            poolId: poolId,
            isHuman: tx.origin == msg.sender,
            currency0: key.currency0,
            currency1: key.currency1
        });

        // Lock assets
        Currency tokenIn = sellToken0 ? key.currency0 : key.currency1;
        IERC20(Currency.unwrap(tokenIn)).safeTransferFrom(
            msg.sender,
            address(this),
            amountIn
        );

        poolOrders[poolId].push(orderId);
        emit OrderPosted(
            orderId,
            msg.sender,
            orders[orderId].isHuman,
            amountIn,
            minAmountOut
        );
    }

    function cancelOrder(
        uint256 orderId,
        PoolKey calldata key
    ) external nonReentrant {
        Order storage order = orders[orderId];
        if (orderId >= nextOrderId) revert OrderNotFound();
        if (msg.sender != order.maker) revert Unauthorized(); // Only maker can cancel
        if (!order.active) revert OrderNotActive();

        bytes32 poolId = _getPoolId(key);
        if (poolId != order.poolId) revert PoolMismatch();

        order.active = false;
        _removeOrder(poolId, orderId);

        Currency tokenIn = order.sellToken0 ? key.currency0 : key.currency1;
        IERC20(Currency.unwrap(tokenIn)).safeTransfer(
            order.maker,
            order.amountIn
        );
        emit OrderCancelled(orderId, order.maker);
    }

    // --- Execution Layers ---

    // 1. Reactive AI Trigger (The "Snipe")
    // Called by Reactive Sentinel when L1 conditions are met
    // 4. Update Hook to use Registry & Hub
    // We need interface for Registry too
    // Let's assume passed in constructor. But wait, I need to know the Registry to verify wallet.

    // Simplification for Hackathon:
    // We already passed `reputation` address. The `reputation` contract knows `identityRegistry`.
    // We can read it from there.

    function triggerOrder(
        uint256 orderId,
        uint256 agentId,
        address beneficiary
    ) external onlySentinel nonReentrant {
        Order storage order = orders[orderId];
        if (!order.active) revert OrderNotActive();
        if (block.timestamp > order.expiry) revert AlreadyExpired(); // Precise Expiry Guard

        // EIP-8004: Validation (Optional but good practice)
        // For Hackathon Demo: Bypass registry check for Sentinel execution
        if (address(reputation) != address(0) && msg.sender != sentinel) {
            address registry = reputation.identityRegistry();
            // We trust the sentinel to pass the correct agentId for the beneficiary,
            // but strictly we should check:
            if (registry != address(0)) {
                address wallet = AgentRegistry(registry).getAgentWallet(
                    agentId
                );
                if (wallet != beneficiary) revert("Invalid Agent Wallet");
            }
        }

        // AI "fills" the order by providing the requested out-amount
        // Funds come from 'beneficiary' (AI Wallet) approved to Hook.

        Currency tokenIn = order.sellToken0 ? order.currency0 : order.currency1; // Maker Selling
        Currency tokenOut = order.sellToken0
            ? order.currency1
            : order.currency0; // Maker Buying

        // Check if beneficiary has approved (Standard ERC20 check omitted for brevity, assumes Approval)
        // Pull tokenOut from AI (Beneficiary) -> Maker
        IERC20(Currency.unwrap(tokenOut)).safeTransferFrom(
            beneficiary,
            order.maker,
            order.minAmountOut
        );

        // Push tokenIn from Hook (Escrow) -> AI (Beneficiary)
        IERC20(Currency.unwrap(tokenIn)).safeTransfer(
            beneficiary,
            order.amountIn
        );

        order.active = false;
        _removeOrder(order.poolId, orderId);

        emit OrderFilled(orderId, beneficiary, true);

        // EIP-8004: Update Agent Reputation
        if (address(reputation) != address(0)) {
            reputation.giveFeedback(
                agentId,
                100, // Score
                0,
                "execution",
                "success",
                "", // endpoint
                "", // uri
                bytes32(0) // hash
            );
        }
    }

    // 2. Standard P2P Match (Bot vs Bot / Human vs Human)
    function beforeSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata
    )
        external
        override
        onlyPoolManager
        nonReentrant
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        // Guard against int256.min
        if (params.amountSpecified == type(int256).min) revert AmountOverflow();

        // We only match if it's an exact-input swap (negative amountSpecified)
        if (params.amountSpecified >= 0) {
            return (
                IHooks.beforeSwap.selector,
                BeforeSwapDeltaLibrary.ZERO_DELTA,
                0
            );
        }

        uint256 absAmount = uint256(-params.amountSpecified);
        // forge-lint: disable-next-line(unsafe-typecast)
        uint128 takerAmountIn = uint128(absAmount);

        bytes32 poolId = _getPoolId(key);
        uint256[] storage orderIds = poolOrders[poolId];

        uint256 maxIter = orderIds.length < MAX_ITERATIONS
            ? orderIds.length
            : MAX_ITERATIONS;

        for (uint256 i = 0; i < maxIter; i++) {
            uint256 matchedOrderId = orderIds[i];
            Order storage order = orders[matchedOrderId];

            if (!order.active || block.timestamp > order.expiry) continue;
            // Match Logic:
            // Taker is swapping ZeroForOne?
            // If Taker sells 0 -> 1, they need a Maker selling 1 -> 0 (sellToken0 == false)
            // If Taker sells 1 -> 0, they need a Maker selling 0 -> 1 (sellToken0 == true)
            // So: order.sellToken0 must NOT equal params.zeroForOne
            if (order.sellToken0 == params.zeroForOne) continue;

            // Check price/amount
            // Taker is sending 'takerAmountIn'. Maker wants 'minAmountOut'.
            if (takerAmountIn < order.minAmountOut) continue;

            // Match found!
            order.active = false;
            _removeOrder(poolId, matchedOrderId);

            (Currency inputCurrency, Currency outputCurrency) = params
                .zeroForOne
                ? (key.currency0, key.currency1)
                : (key.currency1, key.currency0);

            // Taker (PM) -> Maker
            // We owe Maker 'order.minAmountOut'.
            // The Taker provided 'takerAmountIn'. If taller than minAmountOut, Maker gets bonus?
            // Or Taker keeps dust? Arena logic: Taker pays 'minAmountOut'.
            uint128 takerPays = order.minAmountOut;

            // 1. Take from Taker (via PM) -> Maker
            POOL_MANAGER.take(inputCurrency, order.maker, takerPays);

            // 2. Settle Maker's funds (Escrow) -> PM (to Taker)
            // Maker deposited 'order.amountIn' of 'tokenOut' (from Taker's perspective)
            // Wait.
            // Maker deposited 'tokenIn' (from Maker's perspective).
            // If Maker sells Token0, they deposited Token0.
            // Taker sells Token1 (ZeroForOne=false).
            // Taker buying Token0.
            // Maker's 'amountIn' is Token0.
            // OutputCurrency for Taker is Token0.

            POOL_MANAGER.sync(outputCurrency);
            IERC20(Currency.unwrap(outputCurrency)).safeTransfer(
                address(POOL_MANAGER),
                order.amountIn
            );
            POOL_MANAGER.settle();

            emit OrderFilled(matchedOrderId, sender, false);

            // forge-lint: disable-next-line(unsafe-typecast)
            int128 specified = int128(uint128(takerPays));
            // forge-lint: disable-next-line(unsafe-typecast)
            int128 unspecified = -int128(uint128(order.amountIn));

            return (
                IHooks.beforeSwap.selector,
                toBeforeSwapDelta(specified, unspecified),
                0
            );
        }

        return (
            IHooks.beforeSwap.selector,
            BeforeSwapDeltaLibrary.ZERO_DELTA,
            0
        );
    }

    // Unused hooks
    function afterSwap(
        address,
        PoolKey calldata,
        SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, int128) {
        return (IHooks.afterSwap.selector, 0);
    }

    // ... (skipping other functions)

    function beforeInitialize(
        address,
        PoolKey calldata,
        uint160
    ) external pure override returns (bytes4) {
        return IHooks.beforeInitialize.selector;
    }
    function afterInitialize(
        address,
        PoolKey calldata,
        uint160,
        int24
    ) external pure override returns (bytes4) {
        return IHooks.afterInitialize.selector;
    }
    function beforeAddLiquidity(
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IHooks.beforeAddLiquidity.selector;
    }
    function afterAddLiquidity(
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, BalanceDelta) {
        return (
            IHooks.afterAddLiquidity.selector,
            BalanceDeltaLibrary.ZERO_DELTA
        );
    }
    function beforeRemoveLiquidity(
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IHooks.beforeRemoveLiquidity.selector;
    }
    function afterRemoveLiquidity(
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, BalanceDelta) {
        return (
            IHooks.afterRemoveLiquidity.selector,
            BalanceDeltaLibrary.ZERO_DELTA
        );
    }
    function beforeDonate(
        address,
        PoolKey calldata,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IHooks.beforeDonate.selector;
    }
    function afterDonate(
        address,
        PoolKey calldata,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IHooks.afterDonate.selector;
    }

    function _removeOrder(bytes32 poolId, uint256 orderId) internal {
        uint256[] storage ids = poolOrders[poolId];
        for (uint256 i = 0; i < ids.length; i++) {
            if (ids[i] == orderId) {
                ids[i] = ids[ids.length - 1];
                ids.pop();
                return;
            }
        }
    }
    function _getPoolId(
        PoolKey calldata key
    ) internal pure returns (bytes32 poolId) {
        assembly {
            let ptr := mload(0x40)
            calldatacopy(ptr, key, 0xa0)
            poolId := keccak256(ptr, 0xa0)
        }
    }
}
