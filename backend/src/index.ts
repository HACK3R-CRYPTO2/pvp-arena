import { ethers } from 'ethers';
import http from 'http';
import { CONFIG } from './config.js';
import { BotService } from './services/bots.js';
import { ArenaService } from './services/arena.js';

/**
 * 🛠️ PRODUCTION RESILIENCE LAYER v4
 * Optimized for Railway/Vercel Cloud Ops.
 * ⚡️ Instant Binding & Logging to solve 502 Gateway.
 * 🕵️‍♂️ Logs ALL incoming requests to Railway logs.
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
    const server = http.createServer((req, res) => {
        // --- REQUEST LOGGER ---
        const timestamp = new Date().toLocaleTimeString();
        console.log(`📥 [${timestamp}] ${req.method} ${req.url} - (UA: ${req.headers['user-agent']?.slice(0, 30)}...)`);

        // Enable CORS for Vercel
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const url = req.url || '/';

        // 1. Root Liveness & Cloud Probes
        if (url === '/' || url === '/health' || url === '/status') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                status: arena ? "running" : (startupError ? "error" : "starting"),
                message: "PvP Arena API is Live",
                ethPrice: arena?.getMarketState().ethPrice || 3000,
                error: startupError,
                details: {
                    rpc: !!CONFIG.L2_RPC_URL,
                    wallet: !!CONFIG.PRIVATE_KEY,
                    port: PORT
                }
            }));
            return;
        }

        // --- Guard: Block functional routes if AI is not ready ---
        if (!arena || !botService) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Initializing AI services..." }));
            return;
        }

        // 2. Functional Routes (Lazily handled)
        if (url.startsWith('/api/bots/assets/')) {
            const address = url.split('/').pop();
            botService.getBotAssets(address!).then(data => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
            }).catch(() => {
                res.writeHead(500);
                res.end(JSON.stringify({ error: "Data fetch failed" }));
            });
            return;
        }

        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    if (url === '/api/bots/ens/resolve') {
                        const addr = await arena!.resolveName(data.ensName || '');
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: !!addr, address: addr }));
                        return;
                    }
                    if (url === '/api/bots/ens/reverse') {
                        const name = await arena!.reverseResolve(data.address || '');
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: !!name, name }));
                        return;
                    }
                } catch (e) {
                    res.writeHead(400); res.end();
                }
            });
            return;
        }

        res.writeHead(404);
        res.end();
    });

    // 🚀 Start listening on the port Railway provides
    server.listen(PORT, () => {
        console.log(`🌐 [GATEWAY] Live on 0.0.0.0:${PORT}`);
        
        // 🏗️ Startup AI in background
        (async () => {
            try {
                if (!CONFIG.PRIVATE_KEY) throw new Error("Missing PRIVATE_KEY");
                const provider = new ethers.JsonRpcProvider(CONFIG.L2_RPC_URL, undefined, { staticNetwork: true });
                botService = new BotService(provider);
                arena = new ArenaService(provider, botService, CONFIG.L2_HOOK_ADDRESS);
                await arena.start();
                console.log(`✅ [AI-CORE] Armed and ready.`);
            } catch (err: any) {
                startupError = err.message;
                console.error("🚨 [AI-CORE] Load failed:", startupError);
            }
        })();
    });

    server.on('error', (e) => console.error("🚨 [SOCKET] Error:", e));
}

main();
