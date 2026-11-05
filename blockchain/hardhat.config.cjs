const path = require("path");
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("../backend/node_modules/dotenv").config({ path: path.resolve(__dirname, "../backend/.env") });

const SEPOLIA_RPC_URL = process.env.BLOCKCHAIN_RPC_URL || "https://rpc.sepolia.org";

// Validate private key format without printing or exposing key contents
function getValidatedPrivateKey() {
  const rawKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
  if (!rawKey) return [];
  const cleanKey = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(cleanKey)) {
    console.warn("⚠️  BLOCKCHAIN_PRIVATE_KEY is present but does not match 64-hex character EVM private key format.");
    return [];
  }
  return [cleanKey];
}

const accounts = getValidatedPrivateKey();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: accounts,
      chainId: 11155111,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
