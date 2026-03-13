// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {
    ERC721URIStorage
} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {
    MessageHashUtils
} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title EIP-8004 Identity Registry
/// @notice Implements the Identity Registry for Trustless Agents
contract AgentRegistry is ERC721URIStorage, Ownable {
    using ECDSA for bytes32;

    uint256 public nextAgentId = 1; // Start from 1

    // Metadata mappings
    mapping(uint256 => mapping(string => bytes)) private _agentMetadata;

    // Agent Wallets (agentId => wallet address)
    mapping(uint256 => address) private _agentWallets;

    // Errors
    error NotAgentOwner();
    error NotAuthorized();
    error CannotSetWalletDirectly();
    error SignatureExpired();
    error InvalidSignature();

    // Events
    event Registered(
        uint256 indexed agentId,
        string agentURI,
        address indexed owner
    );
    event URIUpdated(
        uint256 indexed agentId,
        string newURI,
        address indexed updatedBy
    );
    event MetadataSet(
        uint256 indexed agentId,
        string indexed indexedMetadataKey,
        string metadataKey,
        bytes metadataValue
    );
    event AgentWalletSet(uint256 indexed agentId, address indexed newWallet);

    struct MetadataEntry {
        string metadataKey;
        bytes metadataValue;
    }

    constructor()
        ERC721("Trustless Agent Identity", "TAI")
        Ownable(msg.sender)
    {}

    // --- Registration ---

    /**
     * @notice Registers a new agent with initial metadata
     * @param agentURI The URI for the agent's metadata
     * @param metadata Initial metadata entries
     * @return agentId The newly created agent ID
     */
    function register(
        string calldata agentURI,
        MetadataEntry[] calldata metadata
    ) external returns (uint256 agentId) {
        agentId = _register(agentURI);

        for (uint256 i = 0; i < metadata.length; i++) {
            _setMetadata(
                agentId,
                metadata[i].metadataKey,
                metadata[i].metadataValue
            );
        }
    }

    function register(
        string calldata agentURI
    ) external returns (uint256 agentId) {
        agentId = _register(agentURI);
    }

    function register() external returns (uint256 agentId) {
        agentId = _register("");
    }

    function _register(
        string memory agentURI
    ) internal returns (uint256 agentId) {
        agentId = nextAgentId++;
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);

        // Set default wallet to owner
        _agentWallets[agentId] = msg.sender;
        emit MetadataSet(
            agentId,
            "agentWallet",
            "agentWallet",
            abi.encode(msg.sender)
        );

        emit Registered(agentId, agentURI, msg.sender);
    }

    // --- URI Management ---

    /**
     * @notice Updates the metadata URI for an agent
     * @param agentId The ID of the agent
     * @param newURI The new URI
     */
    function setAgentURI(uint256 agentId, string calldata newURI) external {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        _setTokenURI(agentId, newURI);
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    // --- Metadata Management ---

    /**
     * @notice Sets metadata for an agent
     * @param agentId The ID of the agent
     * @param metadataKey The key of the metadata
     * @param metadataValue The value of the metadata
     */
    function setMetadata(
        uint256 agentId,
        string calldata metadataKey,
        bytes calldata metadataValue
    ) external {
        if (
            ownerOf(agentId) != msg.sender &&
            getApproved(agentId) != msg.sender &&
            !isApprovedForAll(ownerOf(agentId), msg.sender)
        ) revert NotAuthorized();

        if (keccak256(bytes(metadataKey)) == keccak256(bytes("agentWallet"))) {
            revert CannotSetWalletDirectly();
        }

        _setMetadata(agentId, metadataKey, metadataValue);
    }

    function _setMetadata(
        uint256 agentId,
        string memory metadataKey,
        bytes memory metadataValue
    ) internal {
        _agentMetadata[agentId][metadataKey] = metadataValue;
        emit MetadataSet(agentId, metadataKey, metadataKey, metadataValue);
    }

    /**
     * @notice Retrieves metadata for an agent
     * @param agentId The ID of the agent
     * @param metadataKey The key of the metadata
     * @return The metadata value
     */
    function getMetadata(
        uint256 agentId,
        string calldata metadataKey
    ) external view returns (bytes memory) {
        return _agentMetadata[agentId][metadataKey];
    }

    // --- Wallet Management ---

    /**
     * @notice Securely sets the agent's wallet address using a signature from the new wallet
     * @param agentId The ID of the agent
     * @param newWallet The new wallet address
     * @param deadline Signature expiration timestamp
     * @param signature Signature from the new wallet
     */
    function setAgentWallet(
        uint256 agentId,
        address newWallet,
        uint256 deadline,
        bytes calldata signature
    ) external {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        if (block.timestamp > deadline) revert SignatureExpired();

        bytes32 hash = keccak256(
            abi.encodePacked(
                agentId,
                newWallet,
                deadline,
                block.chainid,
                address(this)
            )
        );
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(hash);
        address signer = ethSignedHash.recover(signature);

        if (signer != newWallet) revert InvalidSignature();

        _agentWallets[agentId] = newWallet;
        emit AgentWalletSet(agentId, newWallet);
        emit MetadataSet(
            agentId,
            "agentWallet",
            "agentWallet",
            abi.encode(newWallet)
        );
    }

    /**
     * @notice Retrieves the wallet address for an agent
     * @param agentId The ID of the agent
     * @return The wallet address
     */
    function getAgentWallet(uint256 agentId) external view returns (address) {
        return _agentWallets[agentId];
    }
}
