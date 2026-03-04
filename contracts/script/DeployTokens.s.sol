// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract DeployTokens is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        MockERC20 tokenA = new MockERC20("Token A", "TKNA");
        console.log("Token A deployed at:", address(tokenA));

        MockERC20 tokenB = new MockERC20("Token B", "TKNB");
        console.log("Token B deployed at:", address(tokenB));

        // Mint some to the agent for "Taker" liquidity
        address agentWallet = 0xd2df53D9791e98Db221842Dd085F4144014BBE2a;
        tokenA.mint(agentWallet, 10000 * 10 ** 18);
        tokenB.mint(agentWallet, 10000 * 10 ** 18);

        console.log("Minted liquidity to Agent:", agentWallet);

        vm.stopBroadcast();
    }
}
