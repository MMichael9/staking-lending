async function main() {
    const mDAI = await ethers.getContractFactory("mDAI");
    // Start deployment, returning a promise that resolves to a contract object
    const initialSupply = 10000; // stablecoin supply
    const contract = await mDAI.deploy(initialSupply);
    await contract.deployed();
    console.log("Contract deployed to address:", contract.address);
  }
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });