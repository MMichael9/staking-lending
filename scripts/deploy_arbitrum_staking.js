async function main() {
    const Staking = await ethers.getContractFactory("Staking");
    // Start deployment, returning a promise that resolves to a contract object
    const mdai_address = "0x9f003ce96B46b7c6f46160383Bb63A2f05b4eca6";
    const price_feed = "0x62CAe0FA2da220f43a51F86Db2EDb36DcA9A5A08";
    const sequencer_feed = "0x4da69F028a5790fCCAfe81a75C0D24f46ceCDd69"

    const contract = await Staking.deploy(price_feed, sequencer_feed, mdai_address);
    await contract.deployed();
    console.log("Contract deployed to address:", contract.address);
  }
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });