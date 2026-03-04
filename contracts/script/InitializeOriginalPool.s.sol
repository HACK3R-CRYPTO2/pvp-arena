// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IPoolManager} from "@v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "@v4-core/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@v4-core/types/Currency.sol";
import {IHooks} from "@v4-core/interfaces/IHooks.sol";

contract InitializeOriginalPool is Script {
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

        uint160 initialSqrtPriceX96 = 79228162514264337593543950336;
        IPoolManager(poolManager).initialize(key, initialSqrtPriceX96);

        console.log("Original Pool Initialized for tokens:", tokenA, tokenB);

        vm.stopBroadcast();
    }
}
