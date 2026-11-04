// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CertiTrustAnchor
 * @notice Immutable cryptographic anchor for CertiTrust skill credentials on Ethereum / Polygon
 */
contract CertiTrustAnchor {
    address public owner;

    struct Credential {
        bytes32 credentialHash;
        address issuer;
        uint256 issuedAt;
        bool revoked;
        bool exists;
    }

    // Mapping from credential hash (keccak256 / sha256) to Credential record
    mapping(bytes32 => Credential) public credentials;

    // Authorized academic & corporate institutional issuers
    mapping(address => bool) public authorizedIssuers;

    // Events
    event IssuerAuthorized(address indexed issuer);
    event IssuerDeauthorized(address indexed issuer);
    event CredentialRegistered(bytes32 indexed credentialHash, address indexed issuer, uint256 timestamp);
    event CredentialRevoked(bytes32 indexed credentialHash, address indexed issuer, uint256 timestamp);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "CertiTrust: caller is not the owner");
        _;
    }

    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender] || msg.sender == owner, "CertiTrust: caller is not an authorized issuer");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedIssuers[msg.sender] = true;
        emit IssuerAuthorized(msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "CertiTrust: new owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function authorizeIssuer(address issuer) external onlyOwner {
        require(issuer != address(0), "CertiTrust: invalid issuer address");
        authorizedIssuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }

    function deauthorizeIssuer(address issuer) external onlyOwner {
        authorizedIssuers[issuer] = false;
        emit IssuerDeauthorized(issuer);
    }

    /**
     * @notice Anchors a verifiable credential hash onto the blockchain
     * @param credentialHash The deterministic cryptographic hash of the credential payload
     */
    function registerCredential(bytes32 credentialHash) external onlyAuthorizedIssuer {
        require(credentialHash != bytes32(0), "CertiTrust: invalid credential hash");
        require(!credentials[credentialHash].exists, "CertiTrust: credential hash already registered");

        credentials[credentialHash] = Credential({
            credentialHash: credentialHash,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            revoked: false,
            exists: true
        });

        emit CredentialRegistered(credentialHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Cryptographically revokes an existing credential on-chain
     * @param credentialHash The credential hash to revoke
     */
    function revokeCredential(bytes32 credentialHash) external {
        Credential storage cred = credentials[credentialHash];
        require(cred.exists, "CertiTrust: credential does not exist");
        require(
            msg.sender == cred.issuer || msg.sender == owner,
            "CertiTrust: caller is not the issuer or contract owner"
        );
        require(!cred.revoked, "CertiTrust: credential is already revoked");

        cred.revoked = true;
        emit CredentialRevoked(credentialHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Performs on-chain verification of a credential
     */
    function verifyCredential(bytes32 credentialHash)
        external
        view
        returns (
            bool exists,
            address issuer,
            uint256 issuedAt,
            bool revoked
        )
    {
        Credential memory cred = credentials[credentialHash];
        return (cred.exists, cred.issuer, cred.issuedAt, cred.revoked);
    }
}
