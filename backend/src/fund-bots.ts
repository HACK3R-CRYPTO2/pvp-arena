import { ethers } from 'ethers';
import { CONFIG } from './config.js';

async function main() {
    const provider = new ethers.JsonRpcProvider(CONFIG.L2_RPC_URL);
    
    // Alpha Wallet (Owner of tokens)
    const alphaWallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    
    // Beta Wallet (Derived)
    const betaKey = ethers.keccak256(ethers.toUtf8Bytes(CONFIG.PRIVATE_KEY + "beta"));
    const betaWallet = new ethers.Wallet(betaKey, provider);

    const TKNA = '0x3263d3c28e2535d1bdb70e9567eec8ee2fdd40e7';
    const TKNB = '0xddee18b54cc13de0e9ec85b7affbb031cc46a7f1';
    const hookAddr = CONFIG.L2_HOOK_ADDRESS;

    const tokenAbi = [
        "function transfer(address, uint256) returns (bool)",
        "function approve(address, uint256) returns (bool)",
        "function balanceOf(address) view returns (uint256)"
    ];

    const tknA = new ethers.Contract(TKNA, tokenAbi, alphaWallet);
    const tknB = new ethers.Contract(TKNB, tokenAbi, alphaWallet);
    const amount = ethers.parseEther("10000");

    console.log(`--- BOT TOKEN SETUP ---`);

    // 1. Transfer to Beta
    console.log(`Sending 10,000 TKNA from Alpha -> Beta...`);
    const txA = await tknA.transfer(betaWallet.address, amount);
    await txA.wait();
    
    console.log(`Sending 10,000 TKNB from Alpha -> Beta...`);
    const txB = await tknB.transfer(betaWallet.address, amount);
    await txB.wait();
    console.log(`Transfers complete.`);

    // 2. Beta Approvals
    console.log(`Setting Beta TKNA approval for Hook...`);
    const tknABeta = new ethers.Contract(TKNA, tokenAbi, betaWallet);
    const approveABeta = await tknABeta.approve(hookAddr, ethers.MaxUint256);
    await approveABeta.wait();

    console.log(`Setting Beta TKNB approval for Hook...`);
    const tknBBeta = new ethers.Contract(TKNB, tokenAbi, betaWallet);
    const approveBBeta = await tknBBeta.approve(hookAddr, ethers.MaxUint256);
    await approveBBeta.wait();
    console.log(`Beta approvals set.`);

    // 3. Alpha Approvals (Just in case)
    console.log(`Setting Alpha TKNA approval for Hook...`);
    const approveAAlpha = await tknA.approve(hookAddr, ethers.MaxUint256);
    await approveAAlpha.wait();

    console.log(`Setting Alpha TKNB approval for Hook...`);
    const approveBAlpha = await tknB.approve(hookAddr, ethers.MaxUint256);
    await approveBAlpha.wait();
    console.log(`Alpha approvals set.`);
}

main().catch(console.error);
