import { mockBlockchainAdapter } from '../adapters/blockchain/mockBlockchainAdapter.js';
import { apiClient } from './apiClient.js';

let cachedStatus = null;
let lastFetchTime = 0;

/**
 * Centralized Blockchain Service
 * Manages smart contract interaction, proof lookups, and ledger connection status.
 * Strictly separates DEMO_MODE from PRODUCTION_MODE.
 * Never presents simulated data as genuine on-chain verification.
 */

export const blockchainService = {
  isDemoMode() {
    if (typeof process !== 'undefined' && process.env?.VITE_ENABLE_MOCK_BLOCKCHAIN !== undefined) {
      return process.env.VITE_ENABLE_MOCK_BLOCKCHAIN === 'true';
    }
    return import.meta.env?.VITE_ENABLE_MOCK_BLOCKCHAIN === 'true';
  },

  isProductionMode() {
    if (this.isDemoMode()) return false;
    return (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') ||
           import.meta.env?.MODE === 'production';
  },

  /**
   * Fetches real-time status and contract details from backend /api/v1/blockchain/status
   */
  async fetchBlockchainStatus(force = false) {
    if (!force && cachedStatus && (Date.now() - lastFetchTime < 30000)) {
      return cachedStatus;
    }
    try {
      const res = await apiClient.get('/blockchain/status');
      if (res && res.data) {
        cachedStatus = res.data;
        lastFetchTime = Date.now();
        return cachedStatus;
      }
    } catch (err) {
      console.warn('Failed to fetch live blockchain status:', err.message);
    }
    return cachedStatus;
  },

  /**
   * Indicates whether live blockchain mode is enabled.
   * Connects via backend relayer and smart contract by default unless mock is explicitly enabled.
   */
  isConnected() {
    if (import.meta.env?.VITE_ENABLE_MOCK_BLOCKCHAIN === 'true') {
      return false;
    }
    if (cachedStatus) {
      return Boolean(cachedStatus.isConnected);
    }
    if (import.meta.env?.VITE_ENABLE_LIVE_BLOCKCHAIN !== undefined) {
      return import.meta.env.VITE_ENABLE_LIVE_BLOCKCHAIN === 'true';
    }
    return true;
  },

  getNetworkConfig() {
    const connected = this.isConnected();
    const liveContract = cachedStatus?.contractAddress || import.meta.env?.VITE_CONTRACT_ADDRESS || null;
    return {
      connected,
      mode: this.isDemoMode() ? 'DEMO_MODE' : 'PRODUCTION_MODE',
      networkName: cachedStatus?.networkName || (connected ? 'Ethereum Sepolia Testnet' : 'Not Connected (Live Network Inactive)'),
      contractAddress: connected ? liveContract : null,
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
        const payload = response?.data || response;
        return {
          ...payload,
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
        const payload = response?.data || response;
        const isConfirmed = Boolean(
          payload?.checks?.blockchainConfirmed || 
          payload?.onChainVerification?.status === 'CONFIRMED_ON_CHAIN' ||
          payload?.verified ||
          payload?.matches
        );
        const anchor = payload?.credential?.blockchainAnchor || payload;
        return {
          verified: isConfirmed,
          status: isConfirmed ? 'VERIFIED' : (payload?.onChainVerification?.status || 'FAILED'),
          network: anchor?.network || this.getNetworkConfig().networkName,
          transactionHash: anchor?.transactionHash || payload?.transactionHash || null,
          blockNumber: anchor?.blockNumber || payload?.blockNumber || null,
          isDemo: false,
          message: isConfirmed 
            ? 'Proof confirmed on live smart contract registry.' 
            : 'Proof digest not yet confirmed on-chain.'
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
