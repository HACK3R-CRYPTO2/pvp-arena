// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IPoolManager} from "@v4-core/interfaces/IPoolManager.sol";
import {ArenaHook} from "../src/ArenaHook.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {AgentReputation} from "../src/AgentReputation.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Existing PoolManager
        address poolManager = 0xB65B40FC59d754Ff08Dacd0c2257F1E2a5a2eE38;
        console.log("Using existing PoolManager at:", poolManager);

        // 2. Deploy AgentRegistry
        AgentRegistry registry = new AgentRegistry();
        console.log("AgentRegistry deployed at:", address(registry));

        // 3. Deploy AgentReputation
        AgentReputation reputation = new AgentReputation(address(registry));
        console.log("AgentReputation deployed at:", address(reputation));

        // 4. Deploy ArenaHook
        ArenaHook hook = new ArenaHook(IPoolManager(poolManager), address(reputation));
        console.log("ArenaHook deployed at:", address(hook));

        // 5. Linking: Authorize Hook in Reputation Registry
        reputation.setAuthorizedHook(address(hook), true);
        console.log("Reputation Authorization: ArenaHook is now an authorized reporter.");

        console.log("Protocol Suite Deployed Successfully.");

        vm.stopBroadcast();
    }
}
