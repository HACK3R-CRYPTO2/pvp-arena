// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {ArenaHook} from "../src/ArenaHook.sol";
import {ArenaSentinel} from "../src/ArenaSentinel.sol";
import {PoolManager} from "@v4-core/PoolManager.sol";
import {IPoolManager} from "@v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "@v4-core/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@v4-core/types/Currency.sol";
import {IHooks} from "@v4-core/interfaces/IHooks.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Simple Mock ERC20
contract MockERC20 is IERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public override totalSupply;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(
        address to,
        uint256 amount
    ) external override returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(
        address spender,
        uint256 amount
    ) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external override returns (bool) {
        if (allowance[from][msg.sender] != type(uint256).max) {
            allowance[from][msg.sender] -= amount;
        }
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

contract ArenaHookTest is Test {
    using CurrencyLibrary for Currency;

    ArenaHook hook;
    PoolManager poolManager;
    ArenaSentinel sentinel; // We will mock this behavior mostly

    MockERC20 token0;
    MockERC20 token1;
    Currency currency0;
    Currency currency1;
    PoolKey key;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob"); // Automated Agent Beneficiary
    address sentinelAddr = makeAddr("sentinel");

    function setUp() public {
        // 1. Deploy PoolManager
        poolManager = new PoolManager(address(this));

        // 2. Deploy Tokens & Sort
        MockERC20 tA = new MockERC20("Token A", "TKA");
        MockERC20 tB = new MockERC20("Token B", "TKB");

        if (address(tA) < address(tB)) {
            token0 = tA;
            token1 = tB;
        } else {
            token0 = tB;
            token1 = tA;
        }

        currency0 = Currency.wrap(address(token0));
        currency1 = Currency.wrap(address(token1));

        // 3. Deploy Hook
        // Note: In real v4, hooks are deployed via CREATE2 to get specific flags.
        // For this unit test of logic, we might ignore valid address checks inside PoolManager
        // unless we strictly test the 'beforeSwap' callback integration with the manager.
        // ArenaHook logic mostly relies on 'triggerOrder' which is external.
        hook = new ArenaHook(poolManager, address(0));

        // 4. Initialize Pool (Optional for Hook logic, but good for context)
        key = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });

        // poolManager.initialize(key, ...); // Skipping full init for logic test to speed up

        // 5. Setup Hook
        hook.setSentinel(sentinelAddr);
    }

    function test_PostOrder() public {
        uint128 amountIn = 100 ether;
        uint128 minOut = 90 ether;

        // Mint to Alice
        token0.mint(alice, amountIn);

        vm.startPrank(alice);
        token0.approve(address(hook), amountIn);

        uint256 orderId = hook.postOrder(key, true, amountIn, minOut, 1 days);
        vm.stopPrank();

        // Checks
        (
            address maker,
            bool sellToken0,
            uint128 aIn,
            uint128 mOut,
            ,
            bool active,
            ,
            ,
            ,

        ) = hook.orders(orderId);

        assertEq(maker, alice);
        assertTrue(sellToken0);
        assertEq(aIn, amountIn);
        assertEq(mOut, minOut);
        assertTrue(active);

        // Check balances
        assertEq(token0.balanceOf(alice), 0);
        assertEq(token0.balanceOf(address(hook)), amountIn);
    }

    function test_TriggerOrder_AI() public {
        // 1. Post Order first
        uint128 amountIn = 100 ether; // Alice sells 100 TKA
        uint128 minOut = 90 ether; // Alice wants 90 TKB

        token0.mint(alice, amountIn);
        vm.startPrank(alice);
        token0.approve(address(hook), amountIn);
        uint256 orderId = hook.postOrder(key, true, amountIn, minOut, 1 days);
        vm.stopPrank();

        // 2. Setup AI (Bob)
        // Bob needs to have 90 TKB to fill the order
        token1.mint(bob, minOut);

        vm.startPrank(bob);
        token1.approve(address(hook), minOut);
        vm.stopPrank();

        // 3. Sentinel Triggers
        vm.startPrank(sentinelAddr);
        hook.triggerOrder(orderId, 1, bob);
        vm.stopPrank();

        // 4. Verify Settlement
        // Alice should have 90 TKB
        assertEq(token1.balanceOf(alice), minOut);
        // Bob should have 100 TKA (Profit!)
        assertEq(token0.balanceOf(bob), amountIn);

        // Order inactive
        (, , , , , bool active, , , , ) = hook.orders(orderId);
        assertFalse(active);
    }

    function test_CancelOrder() public {
        uint128 amountIn = 100 ether;
        token0.mint(alice, amountIn);

        vm.startPrank(alice);
        token0.approve(address(hook), amountIn);
        uint256 orderId = hook.postOrder(key, true, amountIn, 0, 1 days);

        hook.cancelOrder(orderId, key);
        vm.stopPrank();

        // Verify refund
        assertEq(token0.balanceOf(alice), amountIn);

        // Order inactive
        (, , , , , bool active, , , , ) = hook.orders(orderId);
        assertFalse(active);
    }

    function test_UnauthorizedCancel() public {
        uint128 amountIn = 100 ether;
        token0.mint(alice, amountIn);

        vm.startPrank(alice);
        token0.approve(address(hook), amountIn);
        uint256 orderId = hook.postOrder(key, true, amountIn, 0, 1 days);
        vm.stopPrank();

        vm.startPrank(bob);
        vm.expectRevert(); // Should revert with Unauthorized or custom error
        hook.cancelOrder(orderId, key);
        vm.stopPrank();
    }
}
