// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title EIP-8004 Reputation Registry
/// @notice Implements the Reputation system for Trustless Agents
contract AgentReputation is Ownable {
    address public identityRegistry;

    struct Feedback {
        int128 value;
        uint8 valueDecimals;
        string tag1;
        string tag2;
        bool isRevoked;
    }

    // agentId => clientAddress => Feedback[]
    mapping(uint256 => mapping(address => Feedback[])) public feedbacks;

    // agentId => clientAddress => count
    mapping(uint256 => mapping(address => uint64)) public feedbackCounts;

    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        int128 value,
        uint8 valueDecimals,
        string indexed indexedTag1,
        string tag1,
        string tag2,
        string endpoint,
        string feedbackURI,
        bytes32 feedbackHash
    );

    event FeedbackRevoked(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 indexed feedbackIndex
    );

    constructor(address _identityRegistry) Ownable(msg.sender) {
        identityRegistry = _identityRegistry;
    }

    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external {
        // Validation
        require(valueDecimals <= 18, "Invalid decimals");
        // Verify agent existence (optional but recommended)
        try IERC721(identityRegistry).ownerOf(agentId) returns (address owner) {
            require(owner != msg.sender, "Cannot rate own agent");
        } catch {
            revert("Agent does not exist");
        }
        uint64 index = feedbackCounts[agentId][msg.sender] + 1; // 1-indexed according to spec
        feedbackCounts[agentId][msg.sender] = index;

        feedbacks[agentId][msg.sender].push(
            Feedback({
                value: value,
                valueDecimals: valueDecimals,
                tag1: tag1,
                tag2: tag2,
                isRevoked: false
            })
        );

        emit NewFeedback(
            agentId,
            msg.sender,
            index,
            value,
            valueDecimals,
            tag1, // Ideally we hash this if we want indexed string, but spec says "string indexed indexedTag1" which implies we emit it twice or implementation detail. I'll emit tag1 as indexedTag1 for filtering.
            tag1,
            tag2,
            endpoint,
            feedbackURI,
            feedbackHash
        );
    }

    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        require(
            feedbackIndex > 0 &&
                feedbackIndex <= feedbackCounts[agentId][msg.sender],
            "Invalid index"
        );

        Feedback storage f = feedbacks[agentId][msg.sender][feedbackIndex - 1]; // 0-indexed in storage array
        require(!f.isRevoked, "Already revoked");

        f.isRevoked = true;
        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    function getFeedback(
        uint256 agentId,
        address client,
        uint64 feedbackIndex
    ) external view returns (Feedback memory) {
        require(
            feedbackIndex > 0 &&
                feedbackIndex <= feedbackCounts[agentId][client],
            "Invalid index"
        );
        return feedbacks[agentId][client][feedbackIndex - 1];
    }
}
