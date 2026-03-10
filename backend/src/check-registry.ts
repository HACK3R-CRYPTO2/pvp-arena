import { ethers } from 'ethers';
import { CONFIG } from './config.js';

const REGISTRY_ABI = [
    "function nextAgentId() view returns (uint256)",
    "function getAgentWallet(uint256 agentId) view returns (address)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(CONFIG.L2_RPC_URL);
    const registry = new ethers.Contract("0x9db5a15aefec199b718fa4f9c8aec126ba2f9d29", REGISTRY_ABI, provider);

    const nextId = await registry.nextAgentId();
    console.log(`Current Next Agent ID: ${nextId}`);

    for (let i = 1; i < Number(nextId); i++) {
        const wallet = await registry.getAgentWallet(i);
        console.log(`Agent #${i}: ${wallet}`);
    }
}

main().catch(console.error);
