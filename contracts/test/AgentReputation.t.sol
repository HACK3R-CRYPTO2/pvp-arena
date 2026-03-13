// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {AgentReputation} from "../src/AgentReputation.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract AgentReputationTest is Test {
    AgentReputation reputation;
    AgentRegistry registry;

    address alice = makeAddr("alice");

    function setUp() public {
        registry = new AgentRegistry();
        reputation = new AgentReputation(address(registry));
        reputation.setAuthorizedHook(makeAddr("client"), true);
    }

    function test_GiveFeedback() public {
        // Alice registers an agent (ID 1)
        vm.startPrank(alice);
        uint256 agentId = registry.register("ipfs://alice");
        vm.stopPrank();

        address client = makeAddr("client");
        vm.startPrank(client);

        reputation.giveFeedback(
            agentId,
            100, // value
            0, // decimals
            "service",
            "fast",
            "https://endpoint",
            "ipfs://feedback",
            bytes32(0)
        );

        // Check storage
        AgentReputation.Feedback memory fb = reputation.getFeedback(
            agentId,
            client,
            1
        );
        assertEq(fb.value, 100);
        assertEq(fb.tag1, "service");
        assertFalse(fb.isRevoked);

        vm.stopPrank();
    }

    function test_RevokeFeedback() public {
        // Register Agent
        vm.startPrank(alice);
        uint256 agentId = registry.register("ipfs://alice");
        vm.stopPrank();

        // Give Feedback
        address client = makeAddr("client");
        vm.startPrank(client);
        reputation.giveFeedback(agentId, 100, 0, "", "", "", "", bytes32(0));

        // Revoke
        reputation.revokeFeedback(agentId, 1);

        AgentReputation.Feedback memory fb = reputation.getFeedback(
            agentId,
            client,
            1
        );
        assertTrue(fb.isRevoked);
        vm.stopPrank();
    }
}
