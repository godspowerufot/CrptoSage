const hre = require("hardhat");

async function main() {
  // Get the contract factory
  const CryptoPrediction = await hre.ethers.getContractFactory("CryptoPrediction");

  // Deploy the contract
  const cryptoPrediction = await CryptoPrediction.deploy();

  // Wait for the contract to be deployed
  await cryptoPrediction.waitForDeployment();

  console.log("CryptoPrediction deployed to:", await cryptoPrediction.getAddress());
}

// Run the deployment script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });