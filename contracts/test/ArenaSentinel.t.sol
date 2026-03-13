// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {ArenaSentinel} from "../src/ArenaSentinel.sol";
import {IReactive} from "reactive-lib/interfaces/IReactive.sol";

contract ArenaSentinelTest is Test {
    ArenaSentinel sentinel;
    address arenaHook = makeAddr("arenaHook");
    address beneficiary = makeAddr("beneficiary");
    address maker = makeAddr("maker");

    MockSystemContract systemMock;
    address constant SYSTEM_ADDR = 0x0000000000000000000000000000000000fffFfF;

    event Callback(
        uint256 indexed chain_id,
        address indexed _contract,
        uint64 indexed gas_limit,
        bytes payload
    );

    function setUp() public {
        // Deploy Mock System
        systemMock = new MockSystemContract();
        vm.etch(SYSTEM_ADDR, address(systemMock).code);

        sentinel = new ArenaSentinel(arenaHook, beneficiary, 1, address(0));
    }

    function test_React_EmitsCallback() public {
        // 1. Setup Trigger
        uint256 orderId = 1;
        uint256 limitPrice = 3000e18; // 3000 USDC/ETH approx
        // If price > 3000, trigger.
        sentinel.addTrigger(orderId, maker, limitPrice, false);

        // 2. Mock high price (3010)
        // sqrtPriceX96 calculation for 3010
        // price = (sqrtPriceX96 / 2^96)^2 * 1e18 (simplified logic in contract)
        // We want price 3000. Sqrt(3000) * 2^96.
        uint160 highPriceSqrt = uint160(55 * 2 ** 96);

        // 3. Mock Log
        bytes memory logData = abi.encode(
            int128(100),
            int128(-100),
            highPriceSqrt,
            uint128(1000),
            int24(500),
            uint24(3000)
        );

        IReactive.LogRecord memory log = IReactive.LogRecord({
            chain_id: 1301, // ORIGIN_CHAIN_ID
            _contract: 0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640,
            topic_0: 0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f, // SWAP_TOPIC_0
            topic_1: 0,
            topic_2: 0,
            topic_3: 0,
            data: logData,
            block_number: 100,
            op_code: 0,
            block_hash: 0,
            tx_hash: 0,
            log_index: 0
        });

        // 4. Expect Event
        vm.expectEmit(true, true, true, true);

        bytes memory expectedPayload = abi.encodeWithSignature(
            "triggerOrder(uint256,uint256,address)",
            orderId,
            1, // agentId
            beneficiary
        );
        emit Callback(1301, arenaHook, uint64(500000), expectedPayload); // Cast to uint64

        // 5. Fire
        sentinel.react(log);
    }
}

contract MockSystemContract {
    function subscribe(
        uint256 chain_id,
        address _contract,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3
    ) external {}
}
