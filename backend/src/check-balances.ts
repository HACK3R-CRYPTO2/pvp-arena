import { ethers } from 'ethers';
import { CONFIG } from './config.js';

async function main() {
    const provider = new ethers.JsonRpcProvider(CONFIG.L2_RPC_URL);
    
    const alphaWallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const betaKey = ethers.keccak256(ethers.toUtf8Bytes(CONFIG.PRIVATE_KEY + "beta"));
    const betaWallet = new ethers.Wallet(betaKey, provider);

    // Production Tokens on Unichain Sepolia
    const TKNA = '0x3263d3c28e2535d1bdb70e9567eec8ee2fdd40e7';
    const TKNB = '0xddee18b54cc13de0e9ec85b7affbb031cc46a7f1';
    const abi = [
        "function balanceOf(address) view returns (uint256)", 
        "function symbol() view returns (string)",
        "function allowance(address, address) view returns (uint256)"
    ];
    
    try {
        const tknA = new ethers.Contract(TKNA, abi, provider);
        const tknB = new ethers.Contract(TKNB, abi, provider);
        const hookAddr = CONFIG.L2_HOOK_ADDRESS;
        
        console.log(`--- TOKEN STATUS ---`);
        const alphaA = await tknA.balanceOf(alphaWallet.address);
        const alphaB = await tknB.balanceOf(alphaWallet.address);
        const allowA = await tknA.allowance(alphaWallet.address, hookAddr);
        const allowB = await tknB.allowance(alphaWallet.address, hookAddr);

        console.log(`Alpha TKNA Balance: ${ethers.formatEther(alphaA)}`);
        console.log(`Alpha TKNA Allowance to Hook: ${ethers.formatEther(allowA)}`);
        console.log(`Alpha TKNB Balance: ${ethers.formatEther(alphaB)}`);
        console.log(`Alpha TKNB Allowance to Hook: ${ethers.formatEther(allowB)}`);
    } catch (e: any) {
        console.log('Could not fetch token balances:', e.message);
    }
}

main().catch(console.error);
