const hre = require("hardhat");

async function main() {
  console.log("--- Deploying CertiTrustAnchor to", hre.network.name, "---");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);

  const CertiTrustAnchor = await hre.ethers.getContractFactory("CertiTrustAnchor");
  const anchor = await CertiTrustAnchor.deploy();
  await anchor.waitForDeployment();

  const deployedAddress = await anchor.getAddress();
  console.log("✅ CertiTrustAnchor deployed successfully at:", deployedAddress);
  console.log("Update CONTRACT_ADDRESS in backend/.env with:", deployedAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
