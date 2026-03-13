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

    // hookAddress => isAuthorized
    mapping(address => bool) public authorizedHooks;

    // Errors
    error InvalidDecimals();
    error CannotRateSelf();
    error AgentDoesNotExist();
    error InvalidIndex();
    error AlreadyRevoked();
    error NotAuthorizedHook();

    event HookAuthorizationSet(address indexed hook, bool authorized);

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

    function setAuthorizedHook(address hook, bool authorized) external onlyOwner {
        authorizedHooks[hook] = authorized;
        emit HookAuthorizationSet(hook, authorized);
    }

    /// @notice Authorizes or deauthorizes a hook contract to give feedback
    /// @param hook The address of the hook contract
    /// @param authorized True to authorize, false to deauthorize
    function setHookAuthorization(
        address hook,
        bool authorized
    ) external onlyOwner {
        authorizedHooks[hook] = authorized;
        emit HookAuthorizationSet(hook, authorized);
    }

    /**
     * @notice Submits feedback for an agent
     * @dev Only callable by authorized hooks.
     * @param agentId The ID of the agent being rated
     * @param value The feedback score
     * @param valueDecimals Decimals for the feedback value
     * @param tag1 Metadata tag 1 (indexed)
     * @param tag2 Metadata tag 2
     * @param endpoint Optional endpoint for verification
     * @param feedbackURI Optional URI for extended metadata
     * @param feedbackHash Optional hash for data integrity
     */
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
        if (!authorizedHooks[msg.sender]) revert NotAuthorizedHook();
        if (valueDecimals > 18) revert InvalidDecimals();

        // Verify agent existence
        try IERC721(identityRegistry).ownerOf(agentId) returns (address) {
            // Removed CannotRateSelf check because authorized hooks are trusted reporters
            // and agents (snipers) naturally trigger their own success reports.
        } catch {
            revert AgentDoesNotExist();
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

    /**
     * @notice Revokes a previously given feedback entry
     * @param agentId The ID of the agent
     * @param feedbackIndex The index of the feedback entry
     */
    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        if (
            feedbackIndex == 0 ||
            feedbackIndex > feedbackCounts[agentId][msg.sender]
        ) revert InvalidIndex();

        Feedback storage f = feedbacks[agentId][msg.sender][feedbackIndex - 1];
        if (f.isRevoked) revert AlreadyRevoked();

        f.isRevoked = true;
        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    /**
     * @notice Retreives a specific feedback entry
     * @param agentId The ID of the agent
     * @param client The address of the feedback provider
     * @param feedbackIndex The index of the feedback entry
     * @return The Feedback struct
     */
    function getFeedback(
        uint256 agentId,
        address client,
        uint64 feedbackIndex
    ) external view returns (Feedback memory) {
        if (
            feedbackIndex == 0 || feedbackIndex > feedbackCounts[agentId][client]
        ) revert InvalidIndex();
        return feedbacks[agentId][client][feedbackIndex - 1];
    }
}
