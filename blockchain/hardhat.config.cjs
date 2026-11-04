require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../backend/.env" });

const SEPOLIA_RPC_URL = process.env.BLOCKCHAIN_RPC_URL || "https://rpc.sepolia.org";
const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY && process.env.BLOCKCHAIN_PRIVATE_KEY.length >= 64
  ? [process.env.BLOCKCHAIN_PRIVATE_KEY]
  : [];

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
      accounts: PRIVATE_KEY,
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
