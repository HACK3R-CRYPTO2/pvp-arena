// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IPoolManager} from "@v4-core/interfaces/IPoolManager.sol";
import {ArenaHook} from "../src/ArenaHook.sol";
import {AgentReputation} from "../src/AgentReputation.sol";

contract DeployManualMultiSentinel is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address poolManager = 0xB65B40FC59d754Ff08Dacd0c2257F1E2a5a2eE38;
        address reputationAddr = 0xeD1c7F14F40DF269E561Eb775fbD0b9dF3B4892c;

        // Deploy updated Hook
        ArenaHook hook = new ArenaHook(IPoolManager(poolManager), reputationAddr);
        console.log("ArenaHook (Multi-Sentinel) deployed at:", address(hook));

        // Authorize Sentinels
        address alpha = 0xd2df53D9791e98Db221842Dd085F4144014BBE2a;
        address beta = 0x84a78a6f73aC2b74C457965f38f3AFAC9a34A6cC;

        hook.setSentinel(alpha, true);
        hook.setSentinel(beta, true);
        
        console.log("Authorized AlphaMachine as Sentinel:", alpha);
        console.log("Authorized BetaSentinel as Sentinel:", beta);

        // Update Reputation Registry
        AgentReputation reputation = AgentReputation(reputationAddr);
        reputation.setAuthorizedHook(address(hook), true);
        console.log("Hook authorized in Reputation contract.");

        vm.stopBroadcast();
    }
}
