// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ArenaHook} from "../src/ArenaHook.sol";

contract Link is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Configuration
        address arenaHookAddr = 0xb950EE50c98cD686DA34C535955203e2CE065F88;
        address sentinelAddr = 0x4F47D6843095F3b53C67B02C9B72eB1d579051ba;

        // Linking
        ArenaHook(arenaHookAddr).setSentinel(sentinelAddr);
        console.log("Arena Hook linked to Arena Sentinel.");

        vm.stopBroadcast();
    }
}
