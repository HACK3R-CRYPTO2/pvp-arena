// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ArenaSentinel} from "../src/ArenaSentinel.sol";

contract DeployPhase2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Configuration (Contract Addresses)
        address arenaHookAddr = 0xb950EE50c98cD686DA34C535955203e2CE065F88;
        address beneficiary = deployer; 
        uint256 agentId = 1; 

        // 2. Deploy ArenaSentinel
        ArenaSentinel sentinel = new ArenaSentinel{value: 0.05 ether}(
            arenaHookAddr,
            beneficiary,
            agentId,
            address(0) 
        );
        console.log("ArenaSentinel deployed at:", address(sentinel));

        console.log("Sentinel Deployment Complete.");

        vm.stopBroadcast();
    }
}
