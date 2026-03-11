// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ArenaHook} from "../src/ArenaHook.sol";

contract ConfigureHook is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Configuration
        address hookAddress = 0x7f927a09915a582Ce3142bB9D8527D0Aa7aee93C; // New Hardened ArenaHook
        address sentinelAddress = 0xd2df53D9791e98Db221842Dd085F4144014BBE2a; // Agent Wallet for Demo execution

        vm.startBroadcast(deployerPrivateKey);

        ArenaHook hook = ArenaHook(hookAddress);

        // Set the Sentinel address
        // This authorizes the Sentinel (via Reactive Network) to trigger orders on the Hook
        hook.setSentinel(sentinelAddress);

        console.log("ArenaHook sentinel set to:", sentinelAddress);
        console.log("Hook Address:", hookAddress);

        vm.stopBroadcast();
    }
}
