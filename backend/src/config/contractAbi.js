export const CertiTrustAnchorABI = [
  "event IssuerAuthorized(address indexed issuer)",
  "event IssuerDeauthorized(address indexed issuer)",
  "event CredentialRegistered(bytes32 indexed credentialHash, address indexed issuer, uint256 timestamp)",
  "event CredentialRevoked(bytes32 indexed credentialHash, address indexed issuer, uint256 timestamp)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  "function owner() view returns (address)",
  "function transferOwnership(address newOwner)",
  "function authorizeIssuer(address issuer)",
  "function deauthorizeIssuer(address issuer)",
  "function authorizedIssuers(address) view returns (bool)",
  "function registerCredential(bytes32 credentialHash)",
  "function revokeCredential(bytes32 credentialHash)",
  "function verifyCredential(bytes32 credentialHash) view returns (bool exists, address issuer, uint256 issuedAt, bool revoked)",
  "function credentials(bytes32) view returns (bytes32 credentialHash, address issuer, uint256 issuedAt, bool revoked, bool exists)"
];
