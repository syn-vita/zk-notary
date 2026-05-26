// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract zkNotary {
    struct Attestation {
        address attestor;
        address relayer;
        bytes32 authorizationDigest;
        uint64 timestamp;
    }

    mapping(bytes32 => Attestation[]) private attestationsByHash;
    mapping(bytes32 => mapping(address => bool)) private walletAttestedByHash;

    event DocumentAttested(
        bytes32 indexed documentHash,
        bytes32 indexed attestationId,
        address indexed attestor,
        address relayer,
        bytes32 authorizationDigest,
        uint256 timestamp
    );

    function notarize(
        bytes32 documentHash,
        address attestor,
        bytes32 authorizationDigest
    ) external returns (bytes32 attestationId) {
        require(attestor != address(0), "Attestor is required");
        require(documentHash != bytes32(0), "Document hash is required");
        require(authorizationDigest != bytes32(0), "Authorization digest is required");
        require(
            !walletAttestedByHash[documentHash][attestor],
            "Attestation already exists for wallet"
        );

        uint256 index = attestationsByHash[documentHash].length;
        attestationId = keccak256(
            abi.encodePacked(block.chainid, address(this), documentHash, attestor, index)
        );

        attestationsByHash[documentHash].push(
            Attestation({
                attestor: attestor,
                relayer: msg.sender,
                authorizationDigest: authorizationDigest,
                timestamp: uint64(block.timestamp)
            })
        );
        walletAttestedByHash[documentHash][attestor] = true;

        emit DocumentAttested(
            documentHash,
            attestationId,
            attestor,
            msg.sender,
            authorizationDigest,
            block.timestamp
        );
    }

    function getAttestationCount(bytes32 documentHash) external view returns (uint256) {
        return attestationsByHash[documentHash].length;
    }

    function getAttestation(
        bytes32 documentHash,
        uint256 index
    ) external view returns (Attestation memory) {
        require(index < attestationsByHash[documentHash].length, "Attestation index out of bounds");
        return attestationsByHash[documentHash][index];
    }

    function hasWalletAttested(
        bytes32 documentHash,
        address attestor
    ) external view returns (bool) {
        return walletAttestedByHash[documentHash][attestor];
    }

    function getAttestationId(
        bytes32 documentHash,
        uint256 index
    ) external view returns (bytes32) {
        require(index < attestationsByHash[documentHash].length, "Attestation index out of bounds");
        Attestation memory attestation = attestationsByHash[documentHash][index];

        return keccak256(
            abi.encodePacked(block.chainid, address(this), documentHash, attestation.attestor, index)
        );
    }
}
