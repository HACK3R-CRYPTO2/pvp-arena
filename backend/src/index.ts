import { ethers } from 'ethers';
import { CONFIG } from './config.js';
import { BotService } from './services/bots.js';
import { ArenaService } from './services/arena.js';

async function main() {
    try {
        const provider = new ethers.JsonRpcProvider(CONFIG.L2_RPC_URL);
        const botService = new BotService(provider);
        const arena = new ArenaService(provider, botService, CONFIG.L2_HOOK_ADDRESS);

        await arena.start();
    } catch (error) {
        console.error("❌ Fatal Error:", error);
        process.exit(1);
    }
}

main();
