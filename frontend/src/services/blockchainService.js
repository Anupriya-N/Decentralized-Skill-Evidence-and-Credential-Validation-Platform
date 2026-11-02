import { mockBlockchainAdapter } from '../adapters/blockchain/mockBlockchainAdapter';
import { apiClient } from './apiClient';

/**
 * Centralized Blockchain Service
 * Manages smart contract interaction, proof lookups, and ledger connection status.
 */

export const blockchainService = {
  /**
   * Indicates whether an active live web3 provider or live RPC network is connected.
   * If false, UI strictly displays "Blockchain integration not connected" with an informative empty state.
   */
  isConnected() {
    const isLive = import.meta.env.VITE_ENABLE_LIVE_BLOCKCHAIN === 'true';
    return Boolean(isLive && typeof window !== 'undefined' && window.ethereum);
  },

  getNetworkConfig() {
    return {
      connected: this.isConnected(),
      networkName: this.isConnected() ? 'Ethereum Sepolia Testnet' : 'Not Connected (Live Network Inactive)',
      contractAddress: this.isConnected() ? '0x32A6f4B3bC430b2c1C6809E18a2872323c21C28e' : null,
      explorerBaseUrl: 'https://sepolia.etherscan.io'
    };
  },

  async registerProof(credentialId, sha256Digest, issuerWalletOrId) {
    if (this.isConnected()) {
      try {
        return await apiClient.post('/blockchain/register-proof', {
          credentialId,
          sha256Digest,
          issuerWalletOrId
        });
      } catch (err) {
        console.warn('Real blockchain registration failed.', err);
      }
    }
    // Fallback to clearly labelled simulated ledger adapter
    return await mockBlockchainAdapter.registerProof(credentialId, sha256Digest, issuerWalletOrId);
  },

  async verifyProofOnChain(credentialId, sha256Digest) {
    if (this.isConnected()) {
      try {
        return await apiClient.get(`/blockchain/verify/${credentialId}?hash=${sha256Digest}`);
      } catch (err) {
        console.warn('Real blockchain verification query failed.', err);
      }
    }
    return await mockBlockchainAdapter.verifyProofOnChain(credentialId, sha256Digest);
  }
};
