import { ethers } from 'ethers';
import { apiClient } from './apiClient.js';

const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7';
const SEPOLIA_CHAIN_ID_DEC = 11155111;

class WalletService {
  constructor() {
    this.account = null;
    this.chainId = null;
    this.listeners = new Set();
    this.init();
  }

  init() {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on?.('accountsChanged', (accounts) => {
        this.account = accounts[0] || null;
        this.notify();
      });

      window.ethereum.on?.('chainChanged', (chainId) => {
        this.chainId = chainId;
        this.notify();
      });
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener({
          account: this.account,
          chainId: this.chainId,
          isSepolia: this.isSepoliaNetwork(),
          isAvailable: this.isMetaMaskAvailable(),
        });
      } catch (err) {
        console.error('Wallet subscriber error:', err);
      }
    }
  }

  isMetaMaskAvailable() {
    return typeof window !== 'undefined' && Boolean(window.ethereum);
  }

  getConnectedAccount() {
    return this.account;
  }

  getChainId() {
    return this.chainId;
  }

  isSepoliaNetwork() {
    if (!this.chainId) return false;
    const clean = String(this.chainId).toLowerCase();
    return clean === SEPOLIA_CHAIN_ID_HEX || Number(clean) === SEPOLIA_CHAIN_ID_DEC;
  }

  /**
   * Connect MetaMask wallet and ensure it is on Sepolia network
   */
  async connect() {
    if (!this.isMetaMaskAvailable()) {
      throw new Error('MetaMask is not installed. Please install MetaMask browser extension to use institutional blockchain features.');
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No Ethereum accounts found or permission was denied.');
      }

      this.account = ethers.getAddress(accounts[0]);

      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      });
      this.chainId = chainId;

      // Check if network is Ethereum Sepolia, if not prompt switch
      if (!this.isSepoliaNetwork()) {
        await this.switchToSepolia();
      }

      this.notify();
      return {
        address: this.account,
        chainId: this.chainId,
        isSepolia: this.isSepoliaNetwork(),
      };
    } catch (err) {
      if (err.code === 4001) {
        throw new Error('Wallet connection request was rejected by user.');
      }
      throw err;
    }
  }

  /**
   * Switch MetaMask to Ethereum Sepolia network
   */
  async switchToSepolia() {
    if (!this.isMetaMaskAvailable()) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
      });
      this.chainId = SEPOLIA_CHAIN_ID_HEX;
      this.notify();
    } catch (switchError) {
      // Error code 4902 means the network has not been added to MetaMask yet
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID_HEX,
              chainName: 'Ethereum Sepolia Testnet',
              nativeCurrency: {
                name: 'Sepolia Ether',
                symbol: 'SEP',
                decimals: 18,
              },
              rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com', 'https://rpc.sepolia.org'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            },
          ],
        });
        this.chainId = SEPOLIA_CHAIN_ID_HEX;
        this.notify();
      } else {
        throw switchError;
      }
    }
  }

  /**
   * Disconnect wallet session in application
   */
  disconnect() {
    this.account = null;
    this.chainId = null;
    this.notify();
  }

  /**
   * Secure institutional wallet registration via backend challenge signing
   */
  async linkInstitutionalWallet() {
    const address = this.account || (await this.connect()).address;

    // 1. Fetch challenge from backend
    const challengeRes = await apiClient.get('/institutions/wallet/challenge');
    if (!challengeRes?.data?.challenge) {
      throw new Error('Failed to retrieve wallet linking challenge from server.');
    }

    const { challenge, nonce } = challengeRes.data;

    // 2. Request MetaMask personal_sign on the challenge
    let signature;
    try {
      signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [challenge, address],
      });
    } catch (signErr) {
      if (signErr.code === 4001) {
        throw new Error('Wallet verification signature was rejected in MetaMask.');
      }
      throw signErr;
    }

    // 3. Submit signature to backend for cryptographic recovery and persistence
    const linkRes = await apiClient.post('/institutions/wallet/link', {
      address,
      signature,
      nonce,
    });

    return linkRes.data;
  }

  /**
   * Sign EIP-712 IssueAuthorization using MetaMask
   */
  async signIssueAuthorization(credentialHash, deadlineSeconds = 3600) {
    const address = this.account || (await this.connect()).address;

    const paramsRes = await apiClient.get('/institutions/eip712-params');
    if (!paramsRes?.data) {
      throw new Error('Failed to retrieve EIP-712 parameters from backend.');
    }

    const { domain, types, currentNonce } = paramsRes.data;
    const deadline = Math.floor(Date.now() / 1000) + deadlineSeconds;
    const formattedHash = credentialHash.startsWith('0x') ? credentialHash : `0x${credentialHash}`;

    const value = {
      credentialHash: formattedHash,
      issuer: address,
      nonce: currentNonce,
      deadline,
    };

    const typedData = {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        IssueAuthorization: types.IssueAuthorization,
      },
      primaryType: 'IssueAuthorization',
      domain: {
        name: domain.name,
        version: domain.version,
        chainId: domain.chainId,
        verifyingContract: domain.verifyingContract,
      },
      message: value,
    };

    let signature;
    try {
      signature = await window.ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [address, JSON.stringify(typedData)],
      });
    } catch (err) {
      if (err.code === 4001) {
        throw new Error('EIP-712 issuance signature rejected by user in MetaMask.');
      }
      throw err;
    }

    return {
      signature,
      issuer: address,
      nonce: currentNonce,
      deadline,
      credentialHash: formattedHash,
    };
  }

  /**
   * Sign EIP-712 RevokeAuthorization using MetaMask
   */
  async signRevokeAuthorization(credentialHash, deadlineSeconds = 3600) {
    const address = this.account || (await this.connect()).address;

    const paramsRes = await apiClient.get('/institutions/eip712-params');
    if (!paramsRes?.data) {
      throw new Error('Failed to retrieve EIP-712 parameters from backend.');
    }

    const { domain, types, currentNonce } = paramsRes.data;
    const deadline = Math.floor(Date.now() / 1000) + deadlineSeconds;
    const formattedHash = credentialHash.startsWith('0x') ? credentialHash : `0x${credentialHash}`;

    const value = {
      credentialHash: formattedHash,
      issuer: address,
      nonce: currentNonce,
      deadline,
    };

    const typedData = {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        RevokeAuthorization: types.RevokeAuthorization,
      },
      primaryType: 'RevokeAuthorization',
      domain: {
        name: domain.name,
        version: domain.version,
        chainId: domain.chainId,
        verifyingContract: domain.verifyingContract,
      },
      message: value,
    };

    let signature;
    try {
      signature = await window.ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [address, JSON.stringify(typedData)],
      });
    } catch (err) {
      if (err.code === 4001) {
        throw new Error('EIP-712 revocation signature rejected by user in MetaMask.');
      }
      throw err;
    }

    return {
      signature,
      issuer: address,
      nonce: currentNonce,
      deadline,
      credentialHash: formattedHash,
    };
  }
}

export const walletService = new WalletService();
