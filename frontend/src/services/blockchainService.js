import { mockBlockchainAdapter } from '../adapters/blockchain/mockBlockchainAdapter.js';
import { apiClient } from './apiClient.js';

/**
 * Centralized Blockchain Service
 * Manages smart contract interaction, proof lookups, and ledger connection status.
 * Strictly separates DEMO_MODE from PRODUCTION_MODE.
 * Never presents simulated data as genuine on-chain verification.
 */

export const blockchainService = {
  isDemoMode() {
    return import.meta.env?.VITE_ENABLE_MOCK_BLOCKCHAIN === 'true' || 
           import.meta.env?.VITE_ENABLE_LIVE_BLOCKCHAIN !== 'true';
  },

  isProductionMode() {
    return import.meta.env?.MODE === 'production' && 
           import.meta.env?.VITE_ENABLE_LIVE_BLOCKCHAIN === 'true';
  },

  /**
   * Indicates whether an active live web3 provider or live RPC network is connected.
   */
  isConnected() {
    const isLive = import.meta.env?.VITE_ENABLE_LIVE_BLOCKCHAIN === 'true';
    return Boolean(isLive && typeof window !== 'undefined' && window.ethereum);
  },

  getNetworkConfig() {
    const connected = this.isConnected();
    return {
      connected,
      mode: this.isDemoMode() ? 'DEMO_MODE' : 'PRODUCTION_MODE',
      networkName: connected ? 'Ethereum Sepolia Testnet' : 'Not Connected (Live Network Inactive)',
      contractAddress: connected ? '0x32A6f4B3bC430b2c1C6809E18a2872323c21C28e' : null,
      explorerBaseUrl: 'https://sepolia.etherscan.io'
    };
  },

  /**
   * Registers a cryptographic proof digest on the ledger.
   * If live network is connected, routes to backend relayer.
   * Otherwise in demo mode, stores an explicit prototype simulation receipt without fake live claims.
   */
  async registerProof(credentialId, sha256Digest, issuerWalletOrId) {
    if (this.isConnected()) {
      try {
        const response = await apiClient.post('/blockchain/register-proof', {
          credentialId,
          sha256Digest,
          issuerWalletOrId
        });
        return {
          ...response,
          isMock: false,
          isDemo: false
        };
      } catch (err) {
        console.warn('Real blockchain registration failed.', err);
        throw new Error('On-chain registration failed: ' + (err.message || 'Network unreachable'));
      }
    }

    // In demo mode without live blockchain:
    return {
      network: 'Blockchain integration not connected (Demo Mode)',
      chainId: null,
      contractAddress: null,
      transactionHash: null,
      blockNumber: null,
      registeredDigest: sha256Digest,
      issuerReference: issuerWalletOrId,
      registrationStatus: 'pending_on_chain',
      registeredAt: new Date().toISOString(),
      isMock: true,
      isDemo: true,
      simulationNotice: 'Recorded on local prototype registry. No live blockchain transaction created.'
    };
  },

  /**
   * Verifies proof against the distributed ledger.
   * Critical rule: Never returns verified: true without a genuine live network response.
   * Returns:
   * - status: 'VERIFIED' (when genuine on-chain verification passes)
   * - status: 'UNAVAILABLE' (when live network query fails or times out)
   * - status: 'NOT_CONNECTED' (when blockchain integration is not connected to a live network)
   */
  async verifyProofOnChain(credentialId, sha256Digest) {
    if (this.isConnected()) {
      try {
        const response = await apiClient.get(`/blockchain/verify/${encodeURIComponent(credentialId)}?hash=${encodeURIComponent(sha256Digest)}`);
        const isVerified = Boolean(response?.verified && response?.matches);
        return {
          verified: isVerified,
          status: isVerified ? 'VERIFIED' : 'FAILED',
          network: this.getNetworkConfig().networkName,
          transactionHash: response?.transactionHash || null,
          blockNumber: response?.blockNumber || null,
          isDemo: false,
          message: isVerified 
            ? 'Proof confirmed on live smart contract registry.' 
            : 'Proof digest does not match on-chain record.'
        };
      } catch (err) {
        console.warn('Real blockchain verification query failed.', err);
        return {
          verified: false,
          status: 'UNAVAILABLE',
          network: this.getNetworkConfig().networkName,
          error: err.message,
          isDemo: false,
          message: 'Blockchain network node is unreachable or query timed out.'
        };
      }
    }

    // When no live network is configured:
    return {
      verified: false,
      status: 'NOT_CONNECTED',
      network: 'Blockchain integration not connected',
      isDemo: true,
      message: 'Blockchain integration not connected to live network. Genuine on-chain proof lookup unavailable.'
    };
  }
};
