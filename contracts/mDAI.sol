// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract mDAI is ERC20,Ownable {

    constructor(uint256 initialSupply) ERC20("MichaelDAI", "mDAI") {
        _mint(msg.sender, initialSupply);
    }
}