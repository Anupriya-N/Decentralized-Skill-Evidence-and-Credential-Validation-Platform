const hre = require("hardhat");

async function main() {
  console.log("--- Deploying CertiTrustAnchor to network:", hre.network.name, "---");

  const signers = await hre.ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error(
      "Deployment aborted: No signer account available. For Sepolia, configure a valid BLOCKCHAIN_PRIVATE_KEY in backend/.env."
    );
  }

  const deployer = signers[0];
  console.log("Deployer account:", deployer.address);

  if (hre.network.name === "sepolia") {
    const chainId = (await hre.ethers.provider.getNetwork()).chainId;
    if (Number(chainId) !== 11155111) {
      throw new Error(`Deployment aborted: Target network chain ID (${chainId}) is not Sepolia (11155111).`);
    }

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");
    if (balance === 0n) {
      throw new Error(
        `Deployment aborted: Deployer account ${deployer.address} has 0 Sepolia ETH. Fund this account via a Sepolia faucet before deploying.`
      );
    }
  }

  const CertiTrustAnchor = await hre.ethers.getContractFactory("CertiTrustAnchor");
  const anchor = await CertiTrustAnchor.deploy();
  await anchor.waitForDeployment();

  const deployedAddress = await anchor.getAddress();
  console.log("✅ CertiTrustAnchor deployed successfully at:", deployedAddress);
  console.log("👉 Update CONTRACT_ADDRESS in backend/.env with:", deployedAddress);
}

main().catch((error) => {
  console.error("Deployment failed:", error.message || error);
  process.exitCode = 1;
});
