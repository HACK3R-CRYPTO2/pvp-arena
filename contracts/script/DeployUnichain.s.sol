// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {PoolManager} from "@v4-core/PoolManager.sol";
import {ArenaHook} from "../src/ArenaHook.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {AgentReputation} from "../src/AgentReputation.sol";

contract DeployUnichain is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy PoolManager (Simplified, no fee controller for demo)
        // PoolManager constructor: constructor(address _protocolFeeController)
        PoolManager manager = new PoolManager(address(0));
        console.log("PoolManager deployed at:", address(manager));

        // 2. Deploy AgentRegistry (Identity)
        AgentRegistry registry = new AgentRegistry();
        console.log("AgentRegistry deployed at:", address(registry));

        // 3. Deploy AgentReputation (Reputation)
        AgentReputation reputation = new AgentReputation(address(registry));
        console.log("AgentReputation deployed at:", address(reputation));

        // 4. Deploy ArenaHook (Logic)
        // Constructor: (IPoolManager _poolManager, address _reputation)
        ArenaHook hook = new ArenaHook(manager, address(reputation));
        console.log("ArenaHook deployed at:", address(hook));

        // Setup: Hook trusts Reputation? (Already handled in Hook logic via checks)
        // Setup: Reputation trusts Hook?
        // EIP-8004 allows open feedback, so we don't need to addReporter.
        console.log("Contracts deployed and linked.");

        vm.stopBroadcast();
    }
}
