import { ethers } from 'ethers';
import { env } from '../config/env.js';
import { CertiTrustAnchorABI } from '../config/contractAbi.js';

export class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.isConfigured = false;
    this.init();
  }

  async init() {
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
        // Verify contract bytecode exists at configured address
        const code = await this.provider.getCode(env.CONTRACT_ADDRESS);
        if (code && code !== '0x' && code !== '0x0') {
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
   * Health and connectivity check with 2.5s network timeout
   */
  async getStatus() {
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
   * Anchors credential hash on-chain.
   * If not configured or failed, stores NULL transaction values - NEVER fabricates fake hashes.
   */
  async anchorCredential(credentialHash, expectedIssuerAddress) {
    if (!this.isConfigured || !this.contract) {
      return {
        isConfirmed: false,
        status: 'PENDING_BLOCKCHAIN',
        reason: 'Sepolia wallet or contract address not deployed or configured in environment',
        transactionHash: null,
        blockNumber: null,
        contractAddress: null,
      };
    }

    try {
      const formattedHash = credentialHash.startsWith('0x')
        ? credentialHash.padEnd(66, '0').slice(0, 66)
        : '0x' + credentialHash.padEnd(64, '0').slice(0, 64);

      const tx = await this.contract.registerCredential(formattedHash);
      const receipt = await tx.wait(1);

      if (receipt.status !== 1) {
        return {
          isConfirmed: false,
          status: 'FAILED',
          reason: 'Blockchain transaction reverted',
          transactionHash: receipt.hash,
          blockNumber: BigInt(receipt.blockNumber),
        };
      }

      // Read back to confirm on-chain state
      const [exists, onChainIssuer, issuedAt, revoked] = await this.contract.verifyCredential(formattedHash);

      const isIssuerMatch = expectedIssuerAddress
        ? onChainIssuer.toLowerCase() === expectedIssuerAddress.toLowerCase()
        : true;

      const isConfirmed = exists && !revoked && isIssuerMatch;

      return {
        isConfirmed,
        status: isConfirmed ? 'CONFIRMED' : 'FAILED_VALIDATION',
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
   * Read-back verification from smart contract
   */
  async verifyOnChain(credentialHash, expectedIssuerAddress) {
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
      const formattedHash = credentialHash.startsWith('0x')
        ? credentialHash.padEnd(66, '0').slice(0, 66)
        : '0x' + credentialHash.padEnd(64, '0').slice(0, 64);

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
   * Revoke on-chain credential
   */
  async revokeOnChain(credentialHash) {
    if (!this.isConfigured || !this.contract) {
      return { success: false, reason: 'Blockchain wallet not configured' };
    }

    try {
      const formattedHash = credentialHash.startsWith('0x')
        ? credentialHash.padEnd(66, '0').slice(0, 66)
        : '0x' + credentialHash.padEnd(64, '0').slice(0, 64);

      const tx = await this.contract.revokeCredential(formattedHash);
      const receipt = await tx.wait(1);
      return {
        success: receipt.status === 1,
        transactionHash: receipt.hash,
        blockNumber: BigInt(receipt.blockNumber),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export const blockchainService = new BlockchainService();
