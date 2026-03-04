// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IPoolManager} from "@v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "@v4-core/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@v4-core/types/Currency.sol";
import {IHooks} from "@v4-core/interfaces/IHooks.sol";

contract InitializePool is Script {
    using CurrencyLibrary for Currency;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address poolManager = 0xB65B40FC59d754Ff08Dacd0c2257F1E2a5a2eE38;
        address hook = 0x2920EF802075BfBEfA337624bd3268B909C2b3E8;

        address tokenA = 0x3263d3C28e2535d1bdb70e9567eec8eE2FDd40e7;
        address tokenB = 0xdDee18b54CC13de0E9Ec85b7AfFbb031cC46A7F1;

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

        // Initialize with price 1:1 (79228162514264337593543950336)
        uint160 initialSqrtPriceX96 = 79228162514264337593543950336;
        IPoolManager(poolManager).initialize(key, initialSqrtPriceX96);

        console.log("Pool Initialized for tokens:", tokenA, tokenB);

        vm.stopBroadcast();
    }
}
