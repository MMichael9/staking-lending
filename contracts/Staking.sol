// Purpose of this application is to have users deposit some funds and get rewarded for doing so.
// Their funds will be locked in the Staking contract and in return, the user will be allowed to borrow against 
// the staked amount up to a certain %

// stake: Lock tokens into contract
// withdraw: Unlock tokens and withdraw from contract
// claimReward: get reward tokens --> what can this be ? reward mechanism ?

// ETH/USD price feed --> 0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e


// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV2V3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// General Errors
error Staking__StakeFailed();
error Staking__WithdrawFailed();
error Staking__BorrowFailed();
error Staking__RepayFailed();
// Chainlink Errors
error SequencerDown();
error GracePeriodNotOver();

contract Staking is Ownable {
    // Chainlink variables
    AggregatorV2V3Interface internal priceFeed;
    AggregatorV2V3Interface internal sequencerUptimeFeed;
    uint256 private constant GRACE_PERIOD_TIME = 3600;

    // token interface for mDAI
    IERC20 internal erc20Interface;

    // storage variables
    mapping(address => uint256) public balances;
    mapping(address => uint256) public debts;
    uint256 public totalEthStaked;
    uint256 public minStakingValue = 0.05 ether;

    // events
    event Stake(address indexed sender, uint256 amount);
    event Withdraw(address indexed recipient, uint256 amount);
    event Borrow(address indexed borrower, uint256 borrowAmount, int price);
    event Repay(address indexed repayer, uint256 amount);

    constructor(address ethFeedAddress, address sequencerFeedAddress, address mockStableCoinAddress) payable {
        priceFeed = AggregatorV2V3Interface(ethFeedAddress);
        sequencerUptimeFeed = AggregatorV2V3Interface(sequencerFeedAddress);
        erc20Interface = IERC20(mockStableCoinAddress);
    }

    function stake() external payable {
        require(msg.value >= minStakingValue, "You must stake more than the minimum amount!");
        require(debts[msg.sender] == 0, "You must repay loan before staking again!");

        bool success = false;

        uint256 amount = msg.value;
        balances[msg.sender] += amount; // update users balance
        totalEthStaked += amount; // update total staked balance in contract

        success = true;

        if(!success) {
            revert Staking__StakeFailed();
        }
        emit Stake(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        // check user has a balance
        require(balances[msg.sender] >= amount, "Cannot Withdraw, Insufficient Funds!");
        require(debts[msg.sender] == 0, "You are currently in debt!, Unable to withdraw staked funds");

        balances[msg.sender] -= amount;
        totalEthStaked -= amount;

        // transfer eth back to user
        (bool success, /* bytes memory data */) = (msg.sender).call{value: amount}("");

        if(!success) {
            revert Staking__WithdrawFailed();
        }
        emit Withdraw(msg.sender, amount);
    }

    function claimReward() external {
        // Determine users rewards ?
    }

    function borrow() external {
        // check to see if user has staked already
        require(balances[msg.sender] > 0, "You must be staking in order to borrow");
        require(debts[msg.sender] == 0, "Looks like you already have a loan! Repay First!!");

        // if yes, how much are they able to borrow (calculate based on time in staking pool)
        int price = getLatestPrice();
        uint borrowAmount = ((((uint(price) * 1e10) * balances[msg.sender]) / 1e18) / 1e18);
        debts[msg.sender] += borrowAmount;

        // transfer tokens to user and keep record of how much they owe
        bool success = erc20Interface.transfer(msg.sender, borrowAmount);

        if(!success) {
            revert Staking__BorrowFailed();
        }
        emit Borrow(msg.sender, borrowAmount, price);
    }

    function repay(uint256 amount) external {
        require(debts[msg.sender] > 0, "Nothing to repay!");

        debts[msg.sender] -= amount;

        bool success = erc20Interface.transferFrom(msg.sender, address(this), amount);

        if(!success) {
            revert Staking__RepayFailed();
        }
        emit Repay(msg.sender, amount);
    }

    // Check the sequencer status and return the latest price
    function getLatestPrice() public view returns (int) {
        // prettier-ignore
        (
            /*uint80 roundID*/,
            int256 answer,
            uint256 startedAt,
            /*uint256 updatedAt*/,
            /*uint80 answeredInRound*/
        ) = sequencerUptimeFeed.latestRoundData();

        // Answer == 0: Sequencer is up
        // Answer == 1: Sequencer is down
        bool isSequencerUp = answer == 0;
        if (!isSequencerUp) {
            revert SequencerDown();
        }

        // Make sure the grace period has passed after the sequencer is back up.
        uint256 timeSinceUp = block.timestamp - startedAt;
        if (timeSinceUp <= GRACE_PERIOD_TIME) {
            revert GracePeriodNotOver();
        }

        // prettier-ignore
        (
            /*uint80 roundID*/,
            int price,
            /*uint startedAt*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = priceFeed.latestRoundData();

        return price;
    }

    function getDecimals() onlyOwner external view returns(uint8) {
        return priceFeed.decimals();
    }

    function getEthBalance() onlyOwner public view returns(uint256) {
        return address(this).balance;
    }

    function getStablecoinBalance() onlyOwner public view returns(uint256) {
        return erc20Interface.balanceOf(address(this));
    }

    function getBorrowAmount() public view returns(uint256) {
        return ((((uint(getLatestPrice()) * 1e10) * balances[msg.sender]) / 1e18) / 1e18);
    }
}

