/**
 * Mock Blockchain Adapter (Demonstration Ledger)
 * Simulates smart-contract registration on Ethereum Sepolia testnet.
 * Note: Clearly labelled as a simulation for demonstration and academic evaluation.
 */

export const mockBlockchainAdapter = {
  isMock: true,
  networkName: 'Ethereum Sepolia (Simulated)',
  chainId: 11155111,
  contractAddress: '0x32A6f4B3bC430b2c1C6809E18a2872323c21C28e',

  /**
   * Simulates publishing a cryptographic digest to the CredentialRegistry smart contract
   * @param {string} credentialId 
   * @param {string} sha256Digest 
   * @param {string} issuerWalletOrId 
   * @returns {Promise<object>} Transaction receipt proof
   */
  async registerProof(credentialId, sha256Digest, issuerWalletOrId = '0xIssuerAuthority') {
    // Artificial small delay to simulate distributed node broadcast
    await new Promise(resolve => setTimeout(resolve, 800));

    // Generate deterministic yet unique simulated txHash
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const txHash = `0x${randomHex}`;
    const blockNumber = 7500000 + Math.floor(Math.random() * 50000);

    return {
      network: this.networkName,
      chainId: this.chainId,
      contractAddress: this.contractAddress,
      transactionHash: txHash,
      blockNumber: blockNumber,
      registeredDigest: sha256Digest,
      issuerReference: issuerWalletOrId,
      registrationStatus: 'confirmed',
      registeredAt: new Date().toISOString(),
      isMock: true,
      simulationNotice: 'Recorded on simulated Ethereum Sepolia ledger for final year demonstration.'
    };
  },

  /**
   * Simulates checking proof on-chain
   * @param {string} credentialId 
   * @param {string} sha256Digest 
   */
  async verifyProofOnChain(credentialId, sha256Digest) {
    await new Promise(resolve => setTimeout(resolve, 400));
    return {
      exists: true,
      matches: true,
      isMock: true,
      network: this.networkName
    };
  },

  /**
   * Simulates recording a revocation event on-chain
   * @param {string} credentialId 
   * @param {string} reason 
   */
  async recordRevocation(credentialId, reason) {
    await new Promise(resolve => setTimeout(resolve, 600));
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return {
      transactionHash: `0x${randomHex}`,
      revocationBlock: 7550000 + Math.floor(Math.random() * 1000),
      reason,
      revokedAt: new Date().toISOString(),
      isMock: true
    };
  }
};
