// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IPoolManager} from "@v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "@v4-core/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@v4-core/types/Currency.sol";
import {IHooks} from "@v4-core/interfaces/IHooks.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SwapParams} from "@v4-core/types/PoolOperation.sol";

contract ManualSwapToFill is Script {
    using CurrencyLibrary for Currency;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address poolManager = 0xB65B40FC59d754Ff08Dacd0c2257F1E2a5a2eE38;
        address hook = 0x2920EF802075BfBEfA337624bd3268B909C2b3E8;

        address tokenA = 0x16D665fC0f500F7e30b7F347bc5C92f5b38295CA;
        address tokenB = 0x6D0d705312f68eE732B0F22Eaa172405d872b9a9;

        // Sort currencies
        (Currency c0, Currency c1) = tokenA < tokenB
            ? (Currency.wrap(tokenA), Currency.wrap(tokenB))
            : (Currency.wrap(tokenB), Currency.wrap(tokenA));

        PoolKey memory key = PoolKey({
            currency0: c0,
            currency1: c1,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(hook)
        });

        // We want to fill Order #0.
        // Maker sells Token1 (TKNB). Taker sells Token0 (TKNA).
        // zeroForOne = true

        uint256 swapAmount = 6 ether; // Taker sends 6 TKNA

        // Approve PoolManager
        IERC20(Currency.unwrap(c0)).approve(poolManager, swapAmount);

        // Execute Swap via PoolManager
        // Note: Simple POC swap. In V4, many use the 'swap' function via a caller/router.
        // PM.swap(PoolKey key, SwapParams params, bytes hookData)
        // SwapParams: bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96

        IPoolManager(poolManager).swap(
            key,
            SwapParams({
                zeroForOne: true,
                amountSpecified: -int256(swapAmount), // Exact Input
                sqrtPriceLimitX96: 4295128739 // Any limit for now
            }),
            ""
        );

        console.log(
            "Manual Swap Executed. Hook should have matched the order."
        );

        vm.stopBroadcast();
    }
}
