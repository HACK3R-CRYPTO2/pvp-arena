import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

export interface AppConfig {
    L2_RPC_URL: string;
    L2_HOOK_ADDRESS: string;
    AGENT_REGISTRY_ADDRESS: string;
    L1_SENTINEL_ADDRESS: string;
    PRIVATE_KEY: string;
    MIN_PROFIT_THRESHOLD: bigint;
    MOCK_TKNA_ADDRESS: string;
    MOCK_TKNB_ADDRESS: string;
}

const getEnv = (key: string, defaultValue: string = ''): string => {
    const value = process.env[key];
    if (!value && !defaultValue) {
        console.warn(`⚠️  WARNING: ${key} is not set in .env`);
    }
    return value || defaultValue;
};

export const CONFIG: AppConfig = {
    L2_RPC_URL: getEnv('L2_RPC_URL', 'https://unichain-sepolia-rpc.publicnode.com'),
    L2_HOOK_ADDRESS: '0x52d3ee769225b499282e21c9582bd3ff4c426310',
    AGENT_REGISTRY_ADDRESS: '0x94177286736a0d8966bb0b6a8ff4587bce01d359',
    L1_SENTINEL_ADDRESS: '0xed1c7f14f40df269e561eb775fbd0b9df3b4892c', // Wait, the sentinel in backend config might be serving as the reputation address if the junior named it poorly, or it might be the actual reactive sentinel.
    PRIVATE_KEY: getEnv('PRIVATE_KEY'),
    MIN_PROFIT_THRESHOLD: ethers.parseEther(getEnv('MIN_PROFIT_THRESHOLD', "0.0005")),
    MOCK_TKNA_ADDRESS: '0x3263d3c28e2535d1bdb70e9567eec8ee2fdd40e7',
    MOCK_TKNB_ADDRESS: '0xddee18b54cc13de0e9ec85b7affbb031cc46a7f1',
};
