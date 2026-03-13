import { ethers } from 'ethers';
import http from 'http';
import { CONFIG } from './config.js';
import { BotService } from './services/bots.js';
import { ArenaService } from './services/arena.js';

/**
 * 🛠️ PRODUCTION RESILIENCE LAYER v3
 * Optimized for Railway/Vercel Cloud Ops.
 * ⚡️ Starts listener instantly to prevent 502 Bad Gateway.
 * 🕵️‍♂️ Reports configuration health via /status.
 * 🚀 Initializes AI services safely in background.
 */

async function main() {
    process.on('unhandledRejection', (reason) => console.error('🚨 [CRITICAL] Unhandled Rejection:', reason));
    process.on('uncaughtException', (err) => console.error('🚨 [CRITICAL] Uncaught Exception:', err));

    const PORT = process.env.PORT || 3001;
    
    // State containers
    let arena: ArenaService | null = null;
    let botService: BotService | null = null;
    let startupError: string | null = null;

    // 🌐 Multi-Route HTTP Server
    const server = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const path = req.url || '/';

        // 1. Root Liveness Probe (Railway/Vercel)
        if (path === '/' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                status: "live", 
                message: "PvP Arena Gateway is Online",
                orchestrator: "Cloud-Ready AI Core"
            }));
            return;
        }

        // 2. Health & Status Reporter
        if (path === '/status' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: arena ? "synchronized" : (startupError ? "error" : "initializing"),
                error: startupError,
                ethPrice: arena?.getMarketState().ethPrice || 3000,
                configLoaded: {
                    rpc: !!CONFIG.L2_RPC_URL,
                    hook: !!CONFIG.L2_HOOK_ADDRESS,
                    wallet: !!CONFIG.PRIVATE_KEY
                }
            }));
            return;
        }

        // --- Guard: Block functional routes if AI is not ready ---
        if (!arena || !botService) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Service Syncing", detail: startupError }));
            return;
        }

        // 3. Bot Asset Inspection
        if (path.startsWith('/api/bots/assets/') && req.method === 'GET') {
            const address = path.split('/').pop();
            if (address) {
                const data = await botService.getBotAssets(address).catch(() => ({ eth: "0", tokens: [] }));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
                return;
            }
        }

        // 4. Identity Resolvers (ENS)
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    if (path === '/api/bots/ens/resolve') {
                        const address = await arena!.resolveName(data.ensName || '');
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: !!address, address }));
                        return;
                    }
                    if (path === '/api/bots/ens/reverse') {
                        const name = await arena!.reverseResolve(data.address || '');
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: !!name, name }));
                        return;
                    }
                    res.writeHead(404);
                    res.end();
                } catch (e) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid payload' }));
                }
            });
            return;
        }

        res.writeHead(404);
        res.end();
    });

    // 🚀 Bind listener instantly to all interfaces
    server.listen(PORT, () => {
        console.log(`🌐 [GATEWAY] Live on port ${PORT}`);
        
        // 🏗️ Background AI Startup Sequence
        (async () => {
            try {
                if (!CONFIG.PRIVATE_KEY) {
                    throw new Error("PRIVATE_KEY is missing from environment variables!");
                }
                
                const provider = new ethers.JsonRpcProvider(CONFIG.L2_RPC_URL, undefined, { staticNetwork: true });
                botService = new BotService(provider);
                arena = new ArenaService(provider, botService, CONFIG.L2_HOOK_ADDRESS);
                
                console.log(`📡 [AI-CORE] Connecting to Unichain...`);
                await arena.start();
                console.log(`✅ [AI-CORE] System synchronized and armed.`);
            } catch (err: any) {
                startupError = err.message || "Unknown error during background sync";
                console.error("🚨 [AI-CORE] Initialization Error:", startupError);
            }
        })();
    });

    server.on('error', (err) => {
        console.error("🚨 [GATEWAY] Socket Error:", err);
    });
}

main();
