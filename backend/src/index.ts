import { ethers } from 'ethers';
import http from 'http';
import { CONFIG } from './config.js';
import { BotService } from './services/bots.js';
import { ArenaService } from './services/arena.js';

async function main() {
    try {
        const provider = new ethers.JsonRpcProvider(CONFIG.L2_RPC_URL);
        const botService = new BotService(provider);
        const arena = new ArenaService(provider, botService, CONFIG.L2_HOOK_ADDRESS);

        await arena.start();

        // Simple HTTP server to expose market data to frontend
        const server = http.createServer((req, res) => {
            // Enable CORS
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }

            if (req.url === '/status') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(arena.getMarketState()));
            } else {
                res.writeHead(404);
                res.end();
            }
        });

        const PORT = 3001;
        server.listen(PORT, () => {
            console.log(`🌐 Backend Data API listening on http://localhost:${PORT}/status`);
        });

    } catch (error) {
        console.error("❌ Fatal Error:", error);
        process.exit(1);
    }
}

main();
