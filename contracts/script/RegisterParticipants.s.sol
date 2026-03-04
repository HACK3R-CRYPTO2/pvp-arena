// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract RegisterParticipants is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Forge-approved checksummed identity registry address
        AgentRegistry registry = AgentRegistry(
            0x9db5A15aefEC199B718Fa4f9a8AEc126bA2F9D29
        );

        // 1. Register the Human (GazaKing)
        uint256 humanId = registry.register("ipfs://GazaKing_Profile");
        console.log("Registered HUMAN [GazaKing] with AgentID:", humanId);

        // 2. Register AlphaMachine (The Maker)
        uint256 alphaId = registry.register("ipfs://AlphaMachine_Profile");
        console.log("Registered AI [AlphaMachine] with AgentID:", alphaId);

        // 3. Register BetaSentinel (The Sniper)
        uint256 betaId = registry.register("ipfs://BetaSentinel_Profile");
        console.log("Registered AI [BetaSentinel] with AgentID:", betaId);

        vm.stopBroadcast();
    }
}
