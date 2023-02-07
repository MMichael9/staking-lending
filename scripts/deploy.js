// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {

  // get contracts
  const Staking = await hre.ethers.getContractFactory("Staking");
  const Stablecoin = await hre.ethers.getContractFactory("mDAI");
  const MockPriceFeed = await hre.ethers.getContractFactory("MockV3Aggregator");

  const initialBalance = ethers.utils.parseEther("100");
  const initialSupply = 10000; // stablecoin supply
  const DECIMALS = "8" // price feed
  const INITIAL_PRICE = "152360000000" // price feed


  const mockpricefeed = await MockPriceFeed.deploy(DECIMALS, INITIAL_PRICE);
  const stablecoin = await Stablecoin.deploy(initialSupply);
  const staking = await Staking.deploy(mockpricefeed.address, stablecoin.address, {value: initialBalance});


  console.log(
    `Mock Price Feed contract deployed to ${mockpricefeed.address}`
  );

  console.log(
    `Stablecoin contract deployed to ${stablecoin.address}`
  );
  console.log(
    `Staking contract deployed to ${staking.address}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
