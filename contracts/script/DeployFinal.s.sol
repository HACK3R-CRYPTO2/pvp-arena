// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IPoolManager} from "@v4-core/interfaces/IPoolManager.sol";
import {ArenaHook} from "../src/ArenaHook.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {AgentReputation} from "../src/AgentReputation.sol";

contract DeployFinal is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Existing PoolManager
        address poolManager = 0xB65B40FC59d754Ff08Dacd0c2257F1E2a5a2eE38;
        console.log("Using existing PoolManager at:", poolManager);

        // 2. Deploy AgentRegistry
        AgentRegistry registry = new AgentRegistry();
        console.log("AgentRegistry deployed at:", address(registry));

        // 3. Deploy AgentReputation (Fixed)
        AgentReputation reputation = new AgentReputation(address(registry));
        console.log("AgentReputation deployed at:", address(reputation));

        // 4. Deploy ArenaHook (Multi-Sentinel)
        ArenaHook hook = new ArenaHook(IPoolManager(poolManager), address(reputation));
        console.log("ArenaHook deployed at:", address(hook));

        // 5. Authorize Sentinels
        address alpha = 0xd2df53D9791e98Db221842Dd085F4144014BBE2a;
        address beta = 0x84a78a6f73aC2b74C457965f38f3AFAC9a34A6cC;
        hook.setSentinel(alpha, true);
        hook.setSentinel(beta, true);
        console.log("Authorized Sentinels (Alpha & Beta)");

        // 6. Linking
        reputation.setAuthorizedHook(address(hook), true);
        console.log("Reputation Authorization: ArenaHook linked.");

        console.log("Final Protocol Suite Live.");

        vm.stopBroadcast();
    }
}
