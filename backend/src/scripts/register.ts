import { ethers } from 'ethers';
import AgentRegistryABI from '../abi/AgentRegistry.json' with { type: 'json' };
import dotenv from 'dotenv';

dotenv.config();

const REGISTRY_ADDRESS = "0x9db5a15aefec199b718fa4f9c8aec126ba2f9d29";

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.L2_RPC_URL);
    const mainWallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

    // Derive unique addresses for the two bots
    // AlphaMachine = Main Wallet
    // BetaSentinel = Derived from Main Wallet (deterministic but different)
    const betaWallet = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes(process.env.PRIVATE_KEY! + "beta")), provider);

    console.log(`Main Wallet (Owner): ${mainWallet.address}`);
    console.log(`AlphaMachine Wallet: ${mainWallet.address}`);
    console.log(`BetaSentinel Wallet: ${betaWallet.address}`);

    const registry = new ethers.Contract(
        REGISTRY_ADDRESS,
        AgentRegistryABI.abi,
        mainWallet
    );

    // 1. AlphaMachine (AgentID: 1)
    console.log("Registering AlphaMachine...");
    try {
        const tx1 = await registry['register(string)']("ipfs://alpha-machine-metadata");
        await tx1.wait();
        console.log("✅ AlphaMachine Registered (AgentID: 1)");
    } catch (e: any) {
        console.log("AlphaMachine registration skip (already exists or error).");
    }

    // 2. BetaSentinel (AgentID: 2)
    console.log("Registering BetaSentinel...");
    try {
        const tx2 = await registry['register(string)']("ipfs://beta-sentinel-metadata");
        await tx2.wait();
        console.log("✅ BetaSentinel Registered (AgentID: 2)");
    } catch (e: any) {
        console.log("BetaSentinel registration skip.");
    }

    // Set Names as Metadata
    console.log("Setting names in metadata...");
    try {
        await (await registry.setMetadata(1, "name", ethers.toUtf8Bytes("AlphaMachine"))).wait();
        await (await registry.setMetadata(2, "name", ethers.toUtf8Bytes("BetaSentinel"))).wait();
        console.log("✅ Metadata Updated.");
        
        // Update Agent Wallets on-chain
        // Alpha (AgentID 1) -> mainWallet.address (Defaulted already, but good to be explicit)
        // Beta (AgentID 2) -> betaWallet.address (Requires signature from betaWallet)
        
        const deadline = Math.floor(Date.now() / 1000) + 3600;
        const chainId = (await provider.getNetwork()).chainId;
        
        const hash = ethers.solidityPackedKeccak256(
            ["uint256", "address", "uint256", "uint256", "address"],
            [2, betaWallet.address, deadline, chainId, REGISTRY_ADDRESS]
        );
        const signature = await betaWallet.signMessage(ethers.getBytes(hash));
        
        console.log("Setting BetaSentinel wallet on-chain...");
        await (await registry.setAgentWallet(2, betaWallet.address, deadline, signature)).wait();
        console.log("✅ BetaSentinel Wallet registered to AgentID 2.");
        
    } catch (e: any) {
        console.error("Setup failed:", e.message);
    }
}

main();
