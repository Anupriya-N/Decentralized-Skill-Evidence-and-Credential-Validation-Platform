// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CertiTrustAnchor
 * @notice Immutable cryptographic anchor for CertiTrust skill credentials on Ethereum Sepolia
 * @dev Implements EIP-712 typed signature verification allowing relayers to submit transactions
 *      on behalf of authorized institutions while strictly preserving institutional issuer identity.
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

    // Mapping from credential hash to Credential record
    mapping(bytes32 => Credential) public credentials;

    // Authorized academic & corporate institutional issuers
    mapping(address => bool) public authorizedIssuers;

    // Nonces for EIP-712 replay attack prevention per institution
    mapping(address => uint256) public nonces;

    // EIP-712 Domain Separator & TypeHashes
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant ISSUE_TYPEHASH =
        keccak256("IssueAuthorization(bytes32 credentialHash,address issuer,uint256 nonce,uint256 deadline)");
    bytes32 public constant REVOKE_TYPEHASH =
        keccak256("RevokeAuthorization(bytes32 credentialHash,address issuer,uint256 nonce,uint256 deadline)");

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

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("CertiTrustAnchor")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
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
        require(issuer != address(0), "CertiTrust: invalid issuer address");
        authorizedIssuers[issuer] = false;
        emit IssuerDeauthorized(issuer);
    }

    /**
     * @notice Direct credential anchoring by authorized issuer
     */
    function registerCredential(bytes32 credentialHash) external onlyAuthorizedIssuer {
        _register(credentialHash, msg.sender);
    }

    /**
     * @notice Relayed credential anchoring with institutional EIP-712 signature authorization
     * @dev Allows platform relayer to pay gas while recording the verified institution as the true issuer
     */
    function registerCredentialWithSignature(
        bytes32 credentialHash,
        address issuer,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(block.timestamp <= deadline, "CertiTrust: authorization signature expired");
        require(authorizedIssuers[issuer], "CertiTrust: signer is not an authorized issuer");
        require(nonces[issuer] == nonce, "CertiTrust: invalid or consumed nonce");

        bytes32 structHash = keccak256(abi.encode(ISSUE_TYPEHASH, credentialHash, issuer, nonce, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));

        address recovered = _recoverSigner(digest, signature);
        require(recovered == issuer, "CertiTrust: invalid EIP-712 institutional signature");

        nonces[issuer]++;
        _register(credentialHash, issuer);
    }

    function _register(bytes32 credentialHash, address issuer) internal {
        require(credentialHash != bytes32(0), "CertiTrust: invalid credential hash");
        require(!credentials[credentialHash].exists, "CertiTrust: credential hash already registered");

        credentials[credentialHash] = Credential({
            credentialHash: credentialHash,
            issuer: issuer,
            issuedAt: block.timestamp,
            revoked: false,
            exists: true
        });

        emit CredentialRegistered(credentialHash, issuer, block.timestamp);
    }

    /**
     * @notice Direct revocation by original issuer or owner
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
        emit CredentialRevoked(credentialHash, cred.issuer, block.timestamp);
    }

    /**
     * @notice Relayed revocation with institutional EIP-712 signature authorization
     */
    function revokeCredentialWithSignature(
        bytes32 credentialHash,
        address issuer,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(block.timestamp <= deadline, "CertiTrust: authorization signature expired");
        Credential storage cred = credentials[credentialHash];
        require(cred.exists, "CertiTrust: credential does not exist");
        require(cred.issuer == issuer, "CertiTrust: signer is not the original credential issuer");
        require(!cred.revoked, "CertiTrust: credential is already revoked");
        require(nonces[issuer] == nonce, "CertiTrust: invalid or consumed nonce");

        bytes32 structHash = keccak256(abi.encode(REVOKE_TYPEHASH, credentialHash, issuer, nonce, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));

        address recovered = _recoverSigner(digest, signature);
        require(recovered == issuer, "CertiTrust: invalid EIP-712 institutional revocation signature");

        nonces[issuer]++;
        cred.revoked = true;
        emit CredentialRevoked(credentialHash, issuer, block.timestamp);
    }

    function _recoverSigner(bytes32 digest, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "CertiTrust: invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        if (v < 27) {
            v += 27;
        }
        require(v == 27 || v == 28, "CertiTrust: invalid signature 'v' value");
        address signer = ecrecover(digest, v, r, s);
        require(signer != address(0), "CertiTrust: invalid signature recovery");
        return signer;
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
