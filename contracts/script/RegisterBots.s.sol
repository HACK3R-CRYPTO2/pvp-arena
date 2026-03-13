// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract RegisterBots is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address registryAddr = 0x3334f87178ad0f33e61009777a3dfa1756e9c23f;
        AgentRegistry registry = AgentRegistry(registryAddr);

        address alpha = 0xd2df53D9791e98Db221842Dd085F4144014BBE2a;
        address beta = 0x84a78a6f73aC2b74C457965f38f3AFAC9a34A6cC;

        // Register Alpha
        registry.registerAgent(alpha);
        uint256 alphaId = 1; // Assuming sequential
        registry.setMetadata(alphaId, "name", bytes("AlphaMachine"));
        console.log("Registered AlphaMachine (ID 1) at:", alpha);

        // Register Beta
        registry.registerAgent(beta);
        uint256 betaId = 2;
        registry.setMetadata(betaId, "name", bytes("BetaSentinel"));
        console.log("Registered BetaSentinel (ID 2) at:", beta);

        vm.stopBroadcast();
    }
}
