// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ArenaSentinel} from "../src/ArenaSentinel.sol";

contract ConfigureSentinel is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Configuration
        address sentinelAddress = 0xb8d533dD3c8fBE2B7cA394B9C3164a14D362Cf4d; // Deployed ArenaSentinel
        address unichainV4PoolManager = 0xB65B40FC59d754Ff08Dacd0c2257F1E2a5a2eE38; // Unichain V4 PoolManager

        vm.startBroadcast(deployerPrivateKey);

        ArenaSentinel sentinel = ArenaSentinel(payable(sentinelAddress));

        // Initialize Subscription
        // This subscribes the Sentinel to the Unichain V4 PoolManager to listen for swaps
        sentinel.initializeSubscription{value: 0.1 ether}(
            unichainV4PoolManager
        );

        console.log(
            "ArenaSentinel subscription initialized for PoolManager:",
            unichainV4PoolManager
        );
        console.log("Sentinel Address:", sentinelAddress);

        vm.stopBroadcast();
    }
}
