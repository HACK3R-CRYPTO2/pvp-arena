// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ArenaHook} from "../src/ArenaHook.sol";
import {IPoolManager} from "@v4-core/interfaces/IPoolManager.sol";

contract RedeployHook is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Reusing existing PoolManager and Reputation Registry addresses
        address poolManager = 0xB65B40FC59d754Ff08Dacd0c2257F1E2a5a2eE38;
        address reputation = 0xe6cAbd7dbaB3ee8Cff6206C378fa73C99893Af23;

        // Deploy fresh Hook with the fix
        ArenaHook hook = new ArenaHook(IPoolManager(poolManager), reputation);
        console.log("FRESH ArenaHook deployed at:", address(hook));

        // Note: New orders will go to this hook address.
        // Old orders at the old hook will stay active but won't be manageable by this new hook logic.

        vm.stopBroadcast();
    }
}
