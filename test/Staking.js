const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Staking contract", function () {

    async function deployTokenFixture() {
        // Get the ContractFactory and Signers here.
        const Staking = await ethers.getContractFactory("Staking");
        const Stablecoin = await ethers.getContractFactory("mDAI");
        const MockPriceFeed = await ethers.getContractFactory("MockV3Aggregator");
        const MockSequencerFeed = await ethers.getContractFactory("MockV3Aggregator");
        
        const [owner, addr1, addr2] = await ethers.getSigners();
        const initialBalance = ethers.utils.parseEther("100");
        const initialSupply = 10000; // stablecoin supply
        // PRICE FEED MOCK
        const PF_DECIMALS = "8"
        const PF_INITIAL_PRICE = "152360000000"
        // SEQUENCER FEED MOCK
        const SF_DECIMALS = "0"
        const SF_INITIAL = "0"
    
        // To deploy our contract, we just have to call x.deploy() and await
        // its deployed() method, which happens onces its transaction has been
        // mined.
        const hardhatPriceFeed = await MockPriceFeed.deploy(PF_DECIMALS, PF_INITIAL_PRICE);
        const hardhatSequencerFeed = await MockSequencerFeed.deploy(SF_DECIMALS, SF_INITIAL);
        const hardhatStablecoin = await Stablecoin.deploy(initialSupply);
        const hardhatStaking = await Staking.deploy(hardhatPriceFeed.address, hardhatSequencerFeed.address, hardhatStablecoin.address, {value: initialBalance});
    
        await hardhatPriceFeed.deployed();
        await hardhatSequencerFeed.deployed();
        await hardhatStaking.deployed();
        await hardhatStablecoin.deployed();

        let transfer = await hardhatStablecoin.transfer(hardhatStaking.address, initialSupply);
        let success = await hardhatStablecoin.transferOwnership(hardhatStaking.address);

        // Increase time a bit for sequencer
        await time.increase(3600);

        // Fixtures can return anything you consider useful for your tests
        return { Staking, hardhatStaking, owner, addr1, addr2, Stablecoin, hardhatStablecoin, initialSupply, hardhatPriceFeed, initialSupply, hardhatSequencerFeed};
    }

    // Deploy
    describe("Deployment", function () {

        it("Should first deploy the Token contract, then deploy the Staking contract", async function() {
            const{ hardhatStaking, hardhatStablecoin, owner, addr1, addr2, initialSupply } = await loadFixture(deployTokenFixture);

            expect(await hardhatStaking.owner()).to.equal(owner.address);
            expect(await hardhatStaking.getEthBalance()).to.equal(ethers.utils.parseEther("100"));
            expect(await hardhatStaking.getStablecoinBalance()).to.equal(initialSupply);

            expect(await hardhatStablecoin.owner()).to.equal(hardhatStaking.address);
            expect(await hardhatStablecoin.totalSupply()).to.equal(initialSupply);
            expect(await hardhatStablecoin.name()).to.equal("MichaelDAI");
            expect(await hardhatStablecoin.symbol()).to.equal("mDAI");
            expect(await hardhatStablecoin.balanceOf(hardhatStaking.address)).to.equal(initialSupply);
        })

        // it("deploys both contracts then sets ownership of token contract to staking contract", async function () {
        //     const{ hardhatStaking, hardhatStablecoin, owner, addr1, addr2, initialSupply } = await loadFixture(deployTokenFixture);

        //     let stakingContractAddress = hardhatStaking.address;
            
        //     expect(await hardhatStablecoin.owner()).to.equal(owner.address);
            
        //     let transfer = await hardhatStablecoin.transfer(stakingContractAddress, initialSupply);
        //     let success = await hardhatStablecoin.transferOwnership(stakingContractAddress);

        //     expect(await hardhatStablecoin.owner()).to.equal(stakingContractAddress);
        //     expect(await hardhatStablecoin.balanceOf(stakingContractAddress)).to.equal(initialSupply);
        // });

    });

    describe("Staking", function() {

        it("Should let user stake some eth in our contract", async function() {
            const{ hardhatStaking, hardhatStablecoin, owner, addr1, addr2, hardhatPriceFeed } = await loadFixture(deployTokenFixture);

            const stake = await hardhatStaking.connect(addr1).stake({value: ethers.utils.parseEther("0.1")});

            expect( await hardhatStaking.balances(addr1.address)).to.equal(ethers.utils.parseEther("0.1"));
        })

        it("Should let the user stake multiple times and update the totalEthStaked", async function() {
            const{ hardhatStaking, hardhatStablecoin, owner, addr1, addr2, hardhatPriceFeed } = await loadFixture(deployTokenFixture);

            const stakeSuccess = await hardhatStaking.connect(addr1).stake({value: ethers.utils.parseEther("0.2")});
            expect( await hardhatStaking.balances(addr1.address)).to.equal(ethers.utils.parseEther("0.2"));
            expect( await hardhatStaking.totalEthStaked()).to.equal(ethers.utils.parseEther("0.2"));

            const stakeAgain = await hardhatStaking.connect(addr1).stake({value: ethers.utils.parseEther("0.3")});
            expect( await hardhatStaking.balances(addr1.address)).to.equal(ethers.utils.parseEther("0.5"));
            expect( await hardhatStaking.totalEthStaked()).to.equal(ethers.utils.parseEther("0.5"));
        })

        it("Should let user withdraw their staked eth", async function() {
            const{ hardhatStaking, hardhatStablecoin, owner, addr1, addr2, hardhatPriceFeed } = await loadFixture(deployTokenFixture);

            const stakeSuccess = await hardhatStaking.connect(addr2).stake({value: ethers.utils.parseEther("0.09")});

            expect(await hardhatStaking.balances(addr2.address)).to.equal(ethers.utils.parseEther("0.09"));

            const withdrawSuccess = await hardhatStaking.connect(addr2).withdraw(ethers.utils.parseEther("0.09"));

            expect(await hardhatStaking.balances(addr2.address)).to.equal(0);
        })

        it("Should calculate the amount a user can borrow using time staked and stake amount", async function() {
            const{ hardhatStaking, hardhatStablecoin, owner, addr1, addr2, hardhatPriceFeed, initialSupply } = await loadFixture(deployTokenFixture);

            const stakeSuccess = await hardhatStaking.connect(addr2).stake({value: ethers.utils.parseEther("0.1")}); // stake first

            expect(await hardhatStaking.balances(addr2.address)).to.equal(ethers.utils.parseEther("0.1"));

            const initialStakeTime = await hardhatStaking.connect(addr2).stakeTimes(addr2.address);
            
            // Increase time by 3 days
            await time.increase(3 * (60 * 60 * 24));
            await time.increase(1);
        })

        it("Should let the user borrow some funds in 'USD'", async function() {
            const{ hardhatStaking, hardhatStablecoin, owner, addr1, addr2, hardhatPriceFeed, initialSupply } = await loadFixture(deployTokenFixture);

            const stakeSuccess = await hardhatStaking.connect(addr2).stake({value: ethers.utils.parseEther("0.1")}); // stake first
            expect(await hardhatStaking.balances(addr2.address)).to.equal(ethers.utils.parseEther("0.1"));

            expect(await hardhatStablecoin.balanceOf(hardhatStaking.address)).to.equal(10000);

            const borrow = await hardhatStaking.connect(addr2).borrow();
            const rc = await borrow.wait();
            const event = rc.events.find(event => event.event === 'Borrow');
            const [borrower, amount, price] = event.args;


            expect(await hardhatStaking.debts(addr2.address)).to.equal(amount);
            expect(await hardhatStablecoin.balanceOf(addr2.address)).to.equal(amount);

            expect(await hardhatStaking.getStablecoinBalance()).to.equal(initialSupply - amount);

        })

        it("Should let the user repay their loan", async function() {
            const{ hardhatStaking, hardhatStablecoin, owner, addr1, addr2, hardhatPriceFeed, initialSupply } = await loadFixture(deployTokenFixture);

            // user needs to stake first, then borrow, then repay

            //stake
            const stakeSuccess = await hardhatStaking.connect(addr1).stake({value: ethers.utils.parseEther("0.1")});
            expect( await hardhatStaking.balances(addr1.address)).to.equal(ethers.utils.parseEther("0.1"));

            //borrow
            const borrow = await hardhatStaking.connect(addr1).borrow();
            const rc = await borrow.wait();
            const event = rc.events.find(event => event.event === 'Borrow');
            const [borrower, borrowAmount, price] = event.args;

            expect(borrower).to.equal(addr1.address);
            expect(await hardhatStaking.debts(addr1.address)).to.equal(borrowAmount);
            expect(await hardhatStablecoin.balanceOf(addr1.address)).to.equal(borrowAmount);

            expect(await hardhatStaking.getStablecoinBalance()).to.equal(initialSupply - borrowAmount);

            //repay
            const approvalRequired = await hardhatStablecoin.connect(addr1).approve(hardhatStaking.address, 152);

            expect(await hardhatStablecoin.allowance(addr1.address, hardhatStaking.address)).to.equal(152);

            const repay = await hardhatStaking.connect(addr1).repay(152);
            const repayrc = await repay.wait();
            const repayevent = repayrc.events.find(event => event.event === 'Repay');
            const [repayer, repayAmount] = event.args;

            expect(await hardhatStablecoin.balanceOf(repayer)).to.equal(0);

            expect(repayAmount).to.equal(borrowAmount);
            expect(await hardhatStaking.debts(repayer)).to.equal(0);
            expect(await hardhatStaking.getStablecoinBalance()).to.equal(initialSupply);
        })
    })

    describe("Staking Edge Cases", function() {

        it("Should revert if the user tries to borrow without staking", async function() {
            const{ hardhatStaking, hardhatStablecoin, owner, addr1, addr2, hardhatPriceFeed, initialSupply } = await loadFixture(deployTokenFixture);

            await expect(hardhatStaking.connect(addr1).borrow()).to.be.revertedWith("You must be staking in order to borrow")
        })

        it("Should revert if the user tried to repay a loan that they havent taken out", async function() {
            const{ hardhatStaking, hardhatStablecoin, owner, addr1, addr2, hardhatPriceFeed, initialSupply } = await loadFixture(deployTokenFixture);

            await expect(hardhatStaking.connect(addr1).repay(150)).to.be.revertedWith("Nothing to repay!")
        })
    })

});