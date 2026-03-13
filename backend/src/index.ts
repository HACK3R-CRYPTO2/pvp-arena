import { ethers } from 'ethers';
import http from 'http';
import { CONFIG } from './config.js';
import { BotService } from './services/bots.js';
import { ArenaService } from './services/arena.js';

/**
 * 🛠️ PRODUCTION RESILIENCE LAYER
 * This file is optimized for Railway/Vercel cloud deployment.
 * 1. Starts HTTP listener IMMEDIATELY (prevents 502 Bad Gateway).
 * 2. Initializes heavy blockchain services in the background.
 * 3. Handles global network timeouts and RPC failures gracefully.
 */

async function main() {
    // --- Global Error Handlers (Anti-Crash) ---
    process.on('unhandledRejection', (reason, promise) => {
        console.error('🚨 [CRITICAL] Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (err) => {
        console.error('🚨 [CRITICAL] Uncaught Exception:', err);
    });

    const PORT = Number(process.env.PORT) || 3001;
    
    // State containers for lazy initialization
    let arena: ArenaService | null = null;
    let botService: BotService | null = null;

    // 🌐 HTTP Server Definition
    const server = http.createServer(async (req, res) => {
        // Enable CORS for Vercel
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.setHeader('Access-Control-Max-Age', '86400');
            res.writeHead(204);
            res.end();
            return;
        }

        // --- PRODUCTION HEALTH CHECKS ---
        // 1. Root Check (Required for many cloud health monitors)
        if (req.url === '/' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                status: "live", 
                message: "PvP Arena Gateway is Online",
                service: "Backend API v1"
            }));
            return;
        }

        // 2. Status & Market Data
        if (req.url === '/status' && req.method === 'GET') {
            if (!arena) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: "initializing", ethPrice: 3000 }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(arena.getMarketState()));
            return;
        }

        // --- Guard: Ensure services are ready for other routes ---
        if (!arena || !botService) {
            res.writeHead(503);
            res.end(JSON.stringify({ error: "Service Initializing" }));
            return;
        }

        // Dynamic Bot Asset Route
        if (req.url?.startsWith('/api/bots/assets/') && req.method === 'GET') {
            const parts = req.url.split('/');
            const address = parts[parts.length - 1];
            if (address) {
                const data = await botService.getBotAssets(address).catch(() => ({ eth: "0", tokens: [] }));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
                return;
            }
        }

        // ENS & Identity Resolvers
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    if (req.url === '/api/bots/ens/resolve') {
                        const address = await arena!.resolveName(data.ensName || '');
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: !!address, address }));
                        return;
                    }
                    if (req.url === '/api/bots/ens/reverse') {
                        const name = await arena!.reverseResolve(data.address || '');
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: !!name, name }));
                        return;
                    }
                    res.writeHead(404);
                    res.end();
                } catch (e) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid Request' }));
                }
            });
            return;
        }

        res.writeHead(404);
        res.end();
    });

    // 🚀 START LISTENING IMMEDIATELY (Satisfies Railway Health Check)
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 [NODE-PRODUCTION] Gateway OPEN on port ${PORT}`);
        console.log(`📡 [NODE-PRODUCTION] Connecting to RPC: ${CONFIG.L2_RPC_URL ? 'OK' : 'MISSING'}`);
        
        // 🏗️ INITIALIZE SERVICES IN BACKGROUND
        (async () => {
            try {
                const provider = new ethers.JsonRpcProvider(CONFIG.L2_RPC_URL, undefined, {
                    staticNetwork: true,
                });
                
                botService = new BotService(provider);
                arena = new ArenaService(provider, botService, CONFIG.L2_HOOK_ADDRESS);
                
                console.log(`📡 [NODE-PRODUCTION] Starting AI Services...`);
                await arena.start();
                console.log(`✅ [NODE-PRODUCTION] All services synchronized.`);
            } catch (err) {
                console.error("🚨 [NODE-PRODUCTION] Background Initialization failed:", err);
            }
        })();
    });
}

main();
