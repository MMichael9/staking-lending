/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
const { API_URL, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: "0.8.7",
  networks: {
    hardhat: {
      chainId: 1337,
    },
    arbitrum_goerli: {
      chainId: 421613,
      url: API_URL,
      accounts: [`0x${PRIVATE_KEY}`],
    }
  }
};
