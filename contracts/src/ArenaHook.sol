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
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {AgentReputation} from "./AgentReputation.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

/// @title ArenaHook
/// @notice Uniswap v4 hook for PvP Trading Arena (Human vs AI & Bot vs Bot)
/// @dev Implements gas-optimized order management and EIP-8004 reputation integration.
contract ArenaHook is IHooks, ReentrancyGuard, Ownable2Step {
    using BalanceDeltaLibrary for BalanceDelta;
    using CurrencyLibrary for Currency;
    using SafeERC20 for IERC20;

    /// @dev Packed struct to minimize storage slots (Total: 4 slots)
    struct Order {
        address maker;        // 20 bytes (Slot 0)
        uint64 expiry;        // 8 bytes  (Slot 0)
        bool sellToken0;      // 1 byte   (Slot 0)
        bool active;          // 1 byte   (Slot 0)
        bool isHuman;         // 1 byte   (Slot 0)
        uint128 amountIn;     // 16 bytes (Slot 1)
        uint128 minAmountOut; // 16 bytes (Slot 1)
        bytes32 poolId;       // 32 bytes (Slot 2)
        Currency currency0;   // 20 bytes (Slot 3)
        Currency currency1;   // 20 bytes (Slot 4)
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
    error InvalidAgentWallet();

    uint256 public constant MAX_ITERATIONS = 50;

    // State
    IPoolManager public immutable POOL_MANAGER;
    mapping(address => bool) public isSentinel; // Multiple authorized sentinels
    mapping(address => bool) public allowedBots; // Whitelist for Bot-vs-Bot mode

    uint256 public nextOrderId;
    mapping(uint256 => Order) public orders;
    mapping(bytes32 => uint256[]) public poolOrders;

    // EIP-8004 Integration
    AgentReputation public reputation;

    constructor(
        IPoolManager _poolManager,
        address _reputation
    ) Ownable(msg.sender) {
        POOL_MANAGER = _poolManager;
        reputation = AgentReputation(_reputation);
    }

    function _onlySentinel() internal view {
        if (!isSentinel[msg.sender]) revert NotSentinel();
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

    /// @notice Updates the Reactive Sentinel status for an address
    /// @param _sentinel The sentinel address
    /// @param _status True to authorize, false to revoke
    function setSentinel(address _sentinel, bool _status) external onlyOwner {
        isSentinel[_sentinel] = _status;
    }

    /// @notice Updates the Reputation contract address
    /// @param _reputation The new reputation contract address
    function setReputation(address _reputation) external onlyOwner {
        reputation = AgentReputation(_reputation);
    }

    // --- Order Board (Battlefield) ---

    /**
     * @notice Posts a new trade order for the Arena
     * @param key The Uniswap v4 pool key
     * @param sellToken0 True if selling token0, false if selling token1
     * @param amountIn Amount of tokens being escrowed
     * @param minAmountOut Minimum acceptable amount of output tokens
     * @param duration Order lifespan in seconds
     * @return orderId The unique identifier for the created order
     */
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
            expiry: uint64(block.timestamp + duration),
            sellToken0: sellToken0,
            active: true,
            isHuman: tx.origin == msg.sender,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            poolId: poolId,
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

    /**
     * @notice Cancels an active order and refunds escrowed tokens
     * @param orderId The ID of the order to cancel
     * @param key The pool key associated with the order
     */
    function cancelOrder(
        uint256 orderId,
        PoolKey calldata key
    ) external nonReentrant {
        Order storage order = orders[orderId];
        if (orderId >= nextOrderId) revert OrderNotFound();
        if (msg.sender != order.maker) revert Unauthorized();
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

    /**
     * @notice Triggers an order fill by the Reactive Sentinel
     * @dev Only callable by the authorized sentinel. Updates agent reputation upon success.
     * @param orderId ID of the order to fill
     * @param agentId ID of the AI agent executing the fill
     * @param beneficiary Wallet address of the AI agent to receive maker's tokens
     */
    function triggerOrder(
        uint256 orderId,
        uint256 agentId,
        address beneficiary
    ) external onlySentinel nonReentrant {
        Order storage order = orders[orderId];
        if (!order.active) revert OrderNotActive();
        if (block.timestamp > order.expiry) revert AlreadyExpired();

        // EIP-8004: Validation
        if (address(reputation) != address(0) && !isSentinel[msg.sender]) {
            address registry = reputation.identityRegistry();
            if (registry != address(0)) {
                address wallet = AgentRegistry(registry).getAgentWallet(
                    agentId
                );
                if (wallet != beneficiary) revert InvalidAgentWallet();
            }
        }

        Currency tokenIn = order.sellToken0 ? order.currency0 : order.currency1;
        Currency tokenOut = order.sellToken0
            ? order.currency1
            : order.currency0;

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

        // Update Reputation
        if (address(reputation) != address(0)) {
            reputation.giveFeedback(
                agentId,
                100, // Success score
                0,
                "execution",
                "success",
                "",
                "",
                bytes32(0)
            );
        }
    }

    /**
     * @notice Uniswap v4 hook called before a swap occurs
     * @dev Implements the P2P match logic. If a match is found, it short-circuits the swap.
     * @param sender The address initiating the swap
     * @param key The pool key
     * @param params Swap parameters
     * @return selector The function selector
     * @return delta The balance delta for the pool manager
     * @return lpFee The LP fee
     */
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

    /**
     * @dev Internal helper to remove an order ID from the pool's active list
     * @param poolId The ID of the pool
     * @param orderId The ID of the order to remove
     */
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

    /**
     * @dev Internal helper to calculate the pool ID from the pool key
     * @param key The pool key
     * @return poolId The resulting pool ID
     */
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
