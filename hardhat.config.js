require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    creatorTestnet: {
      url: "https://rpc.creatorchain.io",
      chainId: 66665,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
