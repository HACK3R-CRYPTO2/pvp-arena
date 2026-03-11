import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

export const CONFIG = {
    // RPC URLs
    L2_RPC_URL: process.env.L2_RPC_URL || 'https://unichain-sepolia-rpc.publicnode.com',

    // Contract Addresses
    L2_HOOK_ADDRESS: process.env.L2_HOOK_ADDRESS || '0x7f927a09915a582Ce3142bB9D8527D0Aa7aee93C',
    AGENT_REGISTRY_ADDRESS: "0x9db5a15aefec199b718fa4f9c8aec126ba2f9d29",
    L1_SENTINEL_ADDRESS: process.env.L1_SENTINEL_ADDRESS || '', // To be deployed

    // Agent Wallet
    PRIVATE_KEY: process.env.PRIVATE_KEY || '',

    // Trading Parameters
    MIN_PROFIT_THRESHOLD: ethers.parseEther("0.001"), // Example threshold
};

if (!CONFIG.PRIVATE_KEY) {
    console.warn("⚠️  WARNING: PRIVATE_KEY is not set in .env");
}
