// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract RegisterBots is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Registry address on Unichain Sepolia
        AgentRegistry registry = AgentRegistry(
            0xe6cAbd7dbaB3ee8Cff6206C378fa73C99893Af23
        );

        // 1. Register AlphaBot (Market Maker)
        uint256 alphaId = registry.register("ipfs://alpha-bot-metadata");
        registry.setMetadata(alphaId, "name", "AlphaBot");
        console.log("AlphaBot registered with ID:", alphaId);

        // 2. Register BetaBot (Sniper)
        uint256 betaId = registry.register("ipfs://beta-bot-metadata");
        registry.setMetadata(betaId, "name", "BetaBot");
        console.log("BetaBot registered with ID:", betaId);

        vm.stopBroadcast();
    }
}
