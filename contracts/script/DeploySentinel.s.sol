// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ArenaSentinel} from "../src/ArenaSentinel.sol";

contract DeploySentinel is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Configuration
        address arenaHook = 0x2920EF802075BfBEfA337624bd3268B909C2b3E8; // Deployed on Unichain Sepolia
        address beneficiary = deployer; // Profits go to deployer by default
        address l1Pool = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9; // WETH on Sepolia (Known active contract)
        uint256 agentId = 1; // Default Agent ID for this sentinel (The "Sniper Bot")

        vm.startBroadcast(deployerPrivateKey);

        ArenaSentinel sentinel = new ArenaSentinel{value: 0.1 ether}(
            arenaHook,
            beneficiary,
            agentId,
            address(0) // Unused in constructor now
        );
        console.log("ArenaSentinel deployed at:", address(sentinel));

        // sentinel.initializeSubscription(l1Pool);
        // console.log("Subscription initialized for L1 Pool:", l1Pool);
        console.log("Monitoring L1 Uniswap V3 Pool for Arbitrage...");
        console.log("Targeting Link/Destination (ArenaHook):", arenaHook);

        vm.stopBroadcast();
    }
}
