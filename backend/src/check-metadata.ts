import { ethers } from 'ethers';
import { CONFIG } from './config.js';

const REGISTRY_ABI = [
    "function getMetadata(uint256 agentId, string calldata metadataKey) external view returns (bytes memory)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(CONFIG.L2_RPC_URL);
    const registry = new ethers.Contract("0x9db5a15aefec199b718fa4f9c8aec126ba2f9d29", REGISTRY_ABI, provider);

    const keys = ["name", "strategy", "com.pvparena.strategy", "botName"];

    for (const id of [1, 2]) {
        console.log(`\nMetadata for Agent #${id}:`);
        for (const key of keys) {
            const val = await registry.getMetadata(id, key);
            console.log(`  ${key}: ${val === '0x' ? '(empty)' : ethers.toUtf8String(val)}`);
        }
    }
}

main().catch(console.error);
