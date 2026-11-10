import { ethers } from 'ethers';
import { env } from '../config/env.js';
import { CertiTrustAnchorABI } from '../config/contractAbi.js';
import { validateBytes32Hash } from '../utils/crypto.js';

export class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.isConfigured = false;
    this.initPromise = null;
    // Start background initialization promise
    this.initPromise = this.initialize();
  }

  /**
   * Ensures asynchronous initialization is completely resolved before any operations
   */
  async ensureInitialized() {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  async initialize() {
    try {
      if (env.BLOCKCHAIN_RPC_URL) {
        this.provider = new ethers.JsonRpcProvider(env.BLOCKCHAIN_RPC_URL);
      }

      if (
        this.provider &&
        env.BLOCKCHAIN_PRIVATE_KEY &&
        env.BLOCKCHAIN_PRIVATE_KEY.length >= 64 &&
        env.CONTRACT_ADDRESS &&
        ethers.isAddress(env.CONTRACT_ADDRESS)
      ) {
        // Enforce network connection with timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('RPC initialization check timed out')), 2500)
        );

        const checkPromise = Promise.all([
          this.provider.getNetwork(),
          this.provider.getCode(env.CONTRACT_ADDRESS),
        ]);

        const [network, code] = await Promise.race([checkPromise, timeoutPromise]);

        const chainIdMatches = Number(network.chainId) === env.CHAIN_ID;
        const codeExists = code && code !== '0x' && code !== '0x0';

        if (chainIdMatches && codeExists) {
          const cleanKey = env.BLOCKCHAIN_PRIVATE_KEY.startsWith('0x')
            ? env.BLOCKCHAIN_PRIVATE_KEY
            : `0x${env.BLOCKCHAIN_PRIVATE_KEY}`;
          this.signer = new ethers.Wallet(cleanKey, this.provider);
          this.contract = new ethers.Contract(env.CONTRACT_ADDRESS, CertiTrustAnchorABI, this.signer);
          this.isConfigured = true;
        } else {
          this.isConfigured = false;
        }
      } else {
        this.isConfigured = false;
      }
    } catch (err) {
      this.isConfigured = false;
    }
  }

  /**
   * Health and connectivity check
   */
  async getStatus() {
    await this.ensureInitialized();

    try {
      if (!this.provider) {
        return { isConnected: false, status: 'NOT_CONFIGURED', error: 'No RPC endpoint configured' };
      }

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('RPC request timed out')), 2500)
      );

      const checkPromise = Promise.all([
        this.provider.getNetwork(),
        this.provider.getBlockNumber(),
      ]);

      const [network, blockNumber] = await Promise.race([checkPromise, timeoutPromise]);
      const chainIdMatch = Number(network.chainId) === env.CHAIN_ID;

      return {
        isConnected: true,
        status: this.isConfigured ? 'READY' : 'PENDING_CONFIG',
        chainId: Number(network.chainId),
        isExpectedChain: chainIdMatch,
        networkName: network.name,
        latestBlock: blockNumber,
        contractConfigured: Boolean(env.CONTRACT_ADDRESS && ethers.isAddress(env.CONTRACT_ADDRESS)),
      };
    } catch (error) {
      return {
        isConnected: false,
        status: 'DISCONNECTED',
        error: error.message,
      };
    }
  }

  /**
   * Reads current institutional nonce from smart contract for EIP-712 replay protection.
   * Throws explicit error if RPC or contract read fails; never falls back to an invented nonce.
   */
  async getNonce(issuerAddress) {
    await this.ensureInitialized();
    if (!this.provider || !env.CONTRACT_ADDRESS || !ethers.isAddress(env.CONTRACT_ADDRESS)) {
      throw new Error('Blockchain provider or contract address is not configured. Cannot retrieve on-chain issuer nonce.');
    }
    if (!issuerAddress || !ethers.isAddress(issuerAddress)) {
      throw new Error(`Invalid issuer address provided for nonce lookup: ${issuerAddress}`);
    }
    try {
      const readContract = new ethers.Contract(env.CONTRACT_ADDRESS, CertiTrustAnchorABI, this.provider);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('RPC query timed out after 3000ms')), 3000)
      );
      const nonce = await Promise.race([readContract.nonces(issuerAddress), timeoutPromise]);
      return Number(nonce);
    } catch (err) {
      throw new Error(`Failed to retrieve on-chain nonce for issuer ${issuerAddress}: ${err.message}`);
    }
  }

  /**
   * Anchors credential hash on-chain using institutional EIP-712 authorization signature.
   * Enables platform relayer to execute transaction while recording verified institution as issuer.
   */
  async anchorCredentialWithSignature(credentialHash, issuerAddress, nonce, deadline, signature) {
    await this.ensureInitialized();

    if (!validateBytes32Hash(credentialHash)) {
      return {
        isConfirmed: false,
        status: 'INVALID_HASH_FORMAT',
        reason: 'Credential hash must be a valid 32-byte hexadecimal string',
        transactionHash: null,
        blockNumber: null,
        contractAddress: null,
      };
    }

    if (!this.isConfigured || !this.contract) {
      return {
        isConfirmed: false,
        status: 'PENDING_BLOCKCHAIN',
        reason: 'Sepolia relayer wallet or contract address not deployed or configured in environment',
        transactionHash: null,
        blockNumber: null,
        contractAddress: null,
      };
    }

    try {
      const network = await this.provider.getNetwork();
      if (Number(network.chainId) !== env.CHAIN_ID) {
        return {
          isConfirmed: false,
          status: 'CHAIN_MISMATCH',
          reason: `Connected chain ID ${network.chainId} does not match configured chain ID ${env.CHAIN_ID}`,
          transactionHash: null,
          blockNumber: null,
          contractAddress: null,
        };
      }

      const formattedHash = credentialHash.startsWith('0x') ? credentialHash : `0x${credentialHash}`;

      const tx = await this.contract.registerCredentialWithSignature(
        formattedHash,
        issuerAddress,
        nonce,
        deadline,
        signature
      );
      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        return {
          isConfirmed: false,
          status: 'FAILED',
          reason: 'Blockchain transaction reverted or receipt status failed',
          transactionHash: receipt?.hash || null,
          blockNumber: receipt?.blockNumber ? BigInt(receipt.blockNumber) : null,
        };
      }

      // Read back to confirm state and verify issuer identity matches
      const [exists, onChainIssuer, , revoked] = await this.contract.verifyCredential(formattedHash);
      const isIssuerMatch = onChainIssuer.toLowerCase() === issuerAddress.toLowerCase();
      const isConfirmed = exists && !revoked && isIssuerMatch;

      return {
        isConfirmed,
        status: isConfirmed ? 'CONFIRMED' : 'FAILED_ON_CHAIN_READBACK',
        transactionHash: receipt.hash,
        blockNumber: BigInt(receipt.blockNumber),
        gasUsed: BigInt(receipt.gasUsed || 0),
        network: 'Ethereum Sepolia',
        contractAddress: env.CONTRACT_ADDRESS,
        issuer: onChainIssuer,
      };
    } catch (error) {
      return {
        isConfirmed: false,
        status: 'FAILED',
        reason: error.message,
        transactionHash: null,
        blockNumber: null,
        contractAddress: null,
      };
    }
  }

  /**
   * Anchors credential hash on-chain directly.
   * Strictly validates 32-byte hex hash.
   * Stores NULL transaction values for pending operations - NEVER fabricates hashes.
   */
  async anchorCredential(credentialHash, expectedIssuerAddress) {
    await this.ensureInitialized();

    // Priority 4.3: Reject malformed hashes instead of silent padding
    if (!validateBytes32Hash(credentialHash)) {
      return {
        isConfirmed: false,
        status: 'INVALID_HASH_FORMAT',
        reason: 'Credential hash must be a valid 32-byte hexadecimal string',
        transactionHash: null,
        blockNumber: null,
        contractAddress: null,
      };
    }

    if (!this.isConfigured || !this.contract) {
      return {
        isConfirmed: false,
        status: 'PENDING_BLOCKCHAIN',
        reason: 'Sepolia relayer wallet or contract address not deployed or configured in environment',
        transactionHash: null,
        blockNumber: null,
        contractAddress: null,
      };
    }

    try {
      // Priority 4.2: Enforce configured chain ID before write operations
      const network = await this.provider.getNetwork();
      if (Number(network.chainId) !== env.CHAIN_ID) {
        return {
          isConfirmed: false,
          status: 'CHAIN_MISMATCH',
          reason: `Connected chain ID ${network.chainId} does not match configured chain ID ${env.CHAIN_ID}`,
          transactionHash: null,
          blockNumber: null,
          contractAddress: null,
        };
      }

      const formattedHash = credentialHash.startsWith('0x') ? credentialHash : `0x${credentialHash}`;

      const tx = await this.contract.registerCredential(formattedHash);
      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        return {
          isConfirmed: false,
          status: 'FAILED',
          reason: 'Blockchain transaction reverted or receipt status failed',
          transactionHash: receipt?.hash || null,
          blockNumber: receipt?.blockNumber ? BigInt(receipt.blockNumber) : null,
        };
      }

      // Read back to confirm state
      const [exists, onChainIssuer, issuedAt, revoked] = await this.contract.verifyCredential(formattedHash);

      const isIssuerMatch = expectedIssuerAddress
        ? onChainIssuer.toLowerCase() === expectedIssuerAddress.toLowerCase()
        : true;

      const isConfirmed = exists && !revoked && isIssuerMatch;

      return {
        isConfirmed,
        status: isConfirmed ? 'CONFIRMED' : 'FAILED_ON_CHAIN_READBACK',
        transactionHash: receipt.hash,
        blockNumber: BigInt(receipt.blockNumber),
        gasUsed: BigInt(receipt.gasUsed || 0),
        network: 'Ethereum Sepolia',
        contractAddress: env.CONTRACT_ADDRESS,
      };
    } catch (error) {
      return {
        isConfirmed: false,
        status: 'FAILED',
        reason: error.message,
        transactionHash: null,
        blockNumber: null,
        contractAddress: null,
      };
    }
  }

  /**
   * Live on-chain verification from smart contract.
   * Validates chain ID, bytecode, credential existence, issuer address, and revocation status.
   */
  async verifyOnChain(credentialHash, expectedIssuerAddress) {
    await this.ensureInitialized();

    if (!validateBytes32Hash(credentialHash)) {
      return {
        checked: false,
        isConfirmed: false,
        exists: false,
        revoked: false,
        status: 'INVALID_HASH_FORMAT',
      };
    }

    if (!this.provider || !env.CONTRACT_ADDRESS || !ethers.isAddress(env.CONTRACT_ADDRESS)) {
      return {
        checked: false,
        isConfirmed: false,
        exists: false,
        revoked: false,
        status: 'CONTRACT_UNCONFIGURED',
      };
    }

    try {
      const readContract = new ethers.Contract(env.CONTRACT_ADDRESS, CertiTrustAnchorABI, this.provider);
      const formattedHash = credentialHash.startsWith('0x') ? credentialHash : `0x${credentialHash}`;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('On-chain read timed out')), 2500)
      );

      const [exists, onChainIssuer, issuedAt, revoked] = await Promise.race([
        readContract.verifyCredential(formattedHash),
        timeoutPromise,
      ]);

      const isIssuerMatch = expectedIssuerAddress
        ? onChainIssuer.toLowerCase() === expectedIssuerAddress.toLowerCase()
        : true;

      return {
        checked: true,
        exists,
        isConfirmed: exists && !revoked && isIssuerMatch,
        issuer: onChainIssuer,
        isIssuerMatch,
        issuedAt: Number(issuedAt),
        revoked,
        status: exists ? (revoked ? 'REVOKED_ON_CHAIN' : (isIssuerMatch ? 'CONFIRMED_ON_CHAIN' : 'ISSUER_MISMATCH')) : 'NOT_FOUND_ON_CHAIN',
      };
    } catch (error) {
      return {
        checked: false,
        isConfirmed: false,
        exists: false,
        revoked: false,
        error: error.message,
        status: 'QUERY_FAILED',
      };
    }
  }

  /**
   * Revoke on-chain credential using institutional EIP-712 revocation signature
   */
  async revokeOnChainWithSignature(credentialHash, issuerAddress, nonce, deadline, signature) {
    await this.ensureInitialized();

    if (!validateBytes32Hash(credentialHash)) {
      return { success: false, reason: 'Invalid credential hash format' };
    }

    if (!this.isConfigured || !this.contract) {
      return { success: false, reason: 'Blockchain relayer wallet or contract not configured' };
    }

    try {
      const formattedHash = credentialHash.startsWith('0x') ? credentialHash : `0x${credentialHash}`;

      const tx = await this.contract.revokeCredentialWithSignature(
        formattedHash,
        issuerAddress,
        nonce,
        deadline,
        signature
      );
      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        return { success: false, reason: 'Transaction reverted or receipt status failed' };
      }

      // Read back to confirm state
      const [, , , revoked] = await this.contract.verifyCredential(formattedHash);

      return {
        success: Boolean(revoked),
        transactionHash: receipt.hash,
        blockNumber: BigInt(receipt.blockNumber),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Revoke on-chain credential directly (Requires contract owner permissions)
   */
  async revokeOnChain(credentialHash) {
    await this.ensureInitialized();

    if (!validateBytes32Hash(credentialHash)) {
      return { success: false, reason: 'Invalid credential hash format' };
    }

    if (!this.isConfigured || !this.contract) {
      return { success: false, reason: 'Blockchain relayer wallet or contract not configured' };
    }

    try {
      // Verify that relayer wallet is the contract owner
      const ownerAddress = await this.contract.owner();
      const relayerAddress = await this.wallet.getAddress();
      if (ownerAddress.toLowerCase() !== relayerAddress.toLowerCase()) {
        return {
          success: false,
          reason: `Relayer wallet (${relayerAddress}) is not the contract owner (${ownerAddress}). Direct revocation requires contract owner permissions.`,
        };
      }

      const formattedHash = credentialHash.startsWith('0x') ? credentialHash : `0x${credentialHash}`;

      const tx = await this.contract.revokeCredential(formattedHash);
      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        return { success: false, reason: 'Transaction reverted or receipt status failed' };
      }

      // Read back to confirm state
      const [, , , revoked] = await this.contract.verifyCredential(formattedHash);

      return {
        success: Boolean(revoked),
        transactionHash: receipt.hash,
        blockNumber: BigInt(receipt.blockNumber),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export const blockchainService = new BlockchainService();
