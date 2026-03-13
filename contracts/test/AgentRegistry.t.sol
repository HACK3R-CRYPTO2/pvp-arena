// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {
    MessageHashUtils
} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract AgentRegistryTest is Test {
    AgentRegistry registry;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    uint256 aliceKey;
    uint256 bobKey;

    function setUp() public {
        (alice, aliceKey) = makeAddrAndKey("alice");
        (bob, bobKey) = makeAddrAndKey("bob");

        registry = new AgentRegistry();
    }

    function test_Register() public {
        vm.startPrank(alice);
        uint256 agentId = registry.register("ipfs://metadata");
        vm.stopPrank();

        assertEq(registry.ownerOf(agentId), alice);
        assertEq(registry.tokenURI(agentId), "ipfs://metadata");
        assertEq(registry.getAgentWallet(agentId), alice); // Default wallet
    }

    function test_SetMetadata() public {
        vm.startPrank(alice);
        uint256 agentId = registry.register("ipfs://metadata");

        registry.setMetadata(agentId, "skills", abi.encode("arbitrage"));
        vm.stopPrank();

        bytes memory data = registry.getMetadata(agentId, "skills");
        assertEq(abi.decode(data, (string)), "arbitrage");
    }

    function test_SetAgentWallet_Signature() public {
        vm.startPrank(alice);
        uint256 agentId = registry.register("ipfs://metadata");
        vm.stopPrank();

        address newWallet = bob;
        uint256 deadline = block.timestamp + 1 hours;

        // Create Signature
        // Hash: keccak256(abi.encodePacked(agentId, newWallet, deadline, chainId, registry))
        bytes32 hash = keccak256(
            abi.encodePacked(
                agentId,
                newWallet,
                deadline,
                block.chainid,
                address(registry)
            )
        );

        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(hash);

        // Sign with BOB's key (proving control of method)
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(bobKey, ethSignedHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Execute
        vm.startPrank(alice);
        registry.setAgentWallet(agentId, newWallet, deadline, signature);
        vm.stopPrank();

        assertEq(registry.getAgentWallet(agentId), bob);
    }

    function test_Fail_SetAgentWallet_BadSignature() public {
        vm.startPrank(alice);
        uint256 agentId = registry.register("ipfs://metadata");
        vm.stopPrank();

        address newWallet = bob;
        uint256 deadline = block.timestamp + 1 hours;

        // Sign with ALICE's key (should be Bob/NewWallet's key)
        bytes32 hash = keccak256(
            abi.encodePacked(
                agentId,
                newWallet,
                deadline,
                block.chainid,
                address(registry)
            )
        );
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(hash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(aliceKey, ethSignedHash); // Wrong signer
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.startPrank(alice);
        vm.expectRevert(AgentRegistry.InvalidSignature.selector);
        registry.setAgentWallet(agentId, newWallet, deadline, signature);
        vm.stopPrank();
    }
}
