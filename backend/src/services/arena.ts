import { ethers } from 'ethers';
import { BotService, BotProfile } from './bots.js';
import ArenaHookABI from '../abi/ArenaHook.json' with { type: 'json' };

export class ArenaService {
    private provider: ethers.JsonRpcProvider;
    private botService: BotService;
    private arenaHook: ethers.Contract;
    private activeOrders: Set<number> = new Set();

    constructor(provider: ethers.JsonRpcProvider, botService: BotService, hookAddress: string) {
        this.provider = provider;
        this.botService = botService;

        // Use AlphaBot's wallet as the primary interaction point for the service,
        // but we'll switch wallets depending on who is performing the action.
        const alpha = botService.getBot(1);
        if (!alpha) throw new Error("AlphaBot not found");

        this.arenaHook = new ethers.Contract(hookAddress, ArenaHookABI.abi, alpha.wallet);
    }

    async start() {
        console.log("⚔️  Arena Service Online (Inspired by Claw2Claw)");
        console.log("------------------------------------------");
        this.botService.getAllBots().forEach(bot => {
            console.log(`🤖 Bot: ${bot.name} | [${bot.strategy}] | ${bot.address}`);
        });
        console.log("------------------------------------------");

        await this.syncOrders();
        this.listenForEvents();
        this.startBaitLoop();
    }

    private async syncOrders() {
        try {
            const nextOrderId = await this.arenaHook.nextOrderId();
            for (let i = 0; i < Number(nextOrderId); i++) {
                const order = await this.arenaHook.orders(i);
                if (order.active) {
                    this.activeOrders.add(i);
                }
            }
            console.log(`📡 Linked to Hook at ${this.arenaHook.target}. Found ${this.activeOrders.size} active orders.`);
        } catch (e) {
            console.error("Failed to sync orders:", e);
        }
    }

    private listenForEvents() {
        this.arenaHook.on('OrderPosted', (orderId, maker, isHuman) => {
            const id = Number(orderId);
            this.activeOrders.add(id);
            const name = this.botService.getBotByAddress(maker)?.name || (isHuman ? "Human" : "Robot");
            console.log(`🆕 [${name}] Posted Order #${id}`);

            // If it's a Human or another bot, trigger the Sniper (BetaBot)
            if (isHuman || maker.toLowerCase() !== this.botService.getBot(2)?.address.toLowerCase()) {
                this.maybeSnipe(id);
            }
        });

        this.arenaHook.on('OrderFilled', (orderId, taker, byAi) => {
            const id = Number(orderId);
            this.activeOrders.delete(id);
            const name = this.botService.getBotByAddress(taker)?.name || "Unknown";
            console.log(`✅ Clash Resolved! Order #${id} filled by ${name} (AI: ${byAi})`);
        });
    }

    private async maybeSnipe(orderId: number) {
        // BetaSentinel (Bot #3) is the designated Sniper for PvP
        const beta = this.botService.getBot(2);
        if (!beta) return;

        // Simulate L1 Signal Detection (The "For Human" Game part)
        console.log(`📡 [L1 Sentinel] Monitoring ETH/USDC liquidity on Mainnet...`);

        setTimeout(async () => {
            const priceMove = (Math.random() * 2).toFixed(2);
            console.log(`🚨 [L1 ALERT] Market volatility detected: +${priceMove}% price move!`);
            console.log(`🎯 ${beta.name} Acquired Target: Order #${orderId}. Sniping...`);

            try {
                // Connect to hook as BetaBot
                const hookWithBeta = this.arenaHook.connect(beta.wallet) as any;

                // triggerOrder(orderId, agentId, beneficiary)
                // BETA_SENTINEL_ID = 3
                const tx = await hookWithBeta.triggerOrder(orderId, 3, beta.address);
                console.log(`🔫 [${beta.name}] CRITICAL STRIKE! Tx: ${tx.hash}`);
                console.log(`🏆 Reputation Updated for [${beta.name}] (AgentID: 3)`);
                await tx.wait();
            } catch (e: any) {
                console.log(`❌ [${beta.name}] Snipe Missed: ${e.message.slice(0, 50)}...`);
            }
        }, 8000); // 8 second simulated latency for L1 signal
    }

    private startBaitLoop() {
        // AlphaMachine (Bot #1) posts a bait order every 60 seconds to keep the arena alive
        setInterval(async () => {
            const alpha = this.botService.getBot(1);
            if (!alpha) return;

            console.log(`🪤  ${alpha.name} (The Maker) is setting a trap...`);
            try {
                // Note: Simplified order posting for demo. 
                // In reality, needs correct PoolKey and approvals.
                // For now, we just want to show the intent in the logs.
                console.log(`   [Action] ${alpha.name} posting P2P Bait Order.`);
            } catch (e) {
                console.error("Bait-loop failed:", e);
            }
        }, 60000);
    }
}
