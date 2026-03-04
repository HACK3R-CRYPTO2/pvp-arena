// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ArenaHook} from "../src/ArenaHook.sol";

contract ConfigureHook is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Configuration
        address hookAddress = 0x2920EF802075BfBEfA337624bd3268B909C2b3E8; // Deployed ArenaHook
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
