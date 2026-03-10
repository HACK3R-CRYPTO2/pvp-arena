import { ethers } from 'ethers';
import { BotService, BotProfile } from './bots.js';
import ArenaHookABI from '../abi/ArenaHook.json' with { type: 'json' };

export class ArenaService {
    private provider: ethers.JsonRpcProvider;
    private botService: BotService;
    private arenaHook: ethers.Contract;
    private activeOrders: Set<number> = new Set();
    private marketState = {
        ethPrice: 3000.00,
        volatility: 0.05,
        lastUpdate: Date.now()
    };

    constructor(provider: ethers.JsonRpcProvider, botService: BotService, hookAddress: string) {
        this.provider = provider;
        this.botService = botService;

        // Use AlphaBot's wallet as the primary interaction point for the service,
        // but we'll switch wallets depending on who is performing the action.
        const alpha = botService.getBot(1);
        if (!alpha) throw new Error("AlphaBot not found");

        this.arenaHook = new ethers.Contract(hookAddress, ArenaHookABI.abi, alpha.wallet);

        // Start market price simulation loop
        this.startMarketSimulation();
    }

    private startMarketSimulation() {
        setInterval(() => {
            // Randomly move price by +/- small amount
            const change = (Math.random() - 0.5) * 2; // -1 to +1
            this.marketState.ethPrice = parseFloat((this.marketState.ethPrice + change).toFixed(2));
            this.marketState.volatility = parseFloat((Math.random() * 2).toFixed(2));
            this.marketState.lastUpdate = Date.now();
        }, 5000);
    }

    public getMarketState() {
        return this.marketState;
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
            const bot = this.botService.getBotByAddress(maker);
            const name = bot ? bot.name : (isHuman ? "Human" : "Robot");
            const role = bot ? "[TACTICIAN]" : "[USER]";
            console.log(`🆕 ${role} ${name} Posted Order #${id}`);

            // If it's a Human or another bot, trigger a Sniper
            this.maybeSnipe(id, maker);
        });

        this.arenaHook.on('OrderFilled', (orderId, taker, byAi) => {
            const id = Number(orderId);
            this.activeOrders.delete(id);
            const bot = this.botService.getBotByAddress(taker);
            const name = bot ? bot.name : "Unknown";
            const role = byAi ? "[SNIPER]" : "[USER]";
            console.log(`✅ Clash Resolved! Order #${id} captured by ${role} ${name}`);
        });
    }

    private async maybeSnipe(orderId: number, makerAddress: string) {
        // Simulate L1 signal latency
        setTimeout(async () => {
            try {
                // 1. Fetch Order Details to check profit
                const order = await this.arenaHook.orders(orderId);
                if (!order.active) return;

                const isTKNA = order.isTKNA;
                const fromAmount = Number(order.fromAmount) / 1e18;
                const toAmount = Number(order.toAmount) / 1e18;
                
                // 2. Symmetric Profit Calculation (Mirroring Frontend Logic)
                const currentPrice = this.marketState.ethPrice;
                let potentialProfit = 0;

                if (isTKNA) {
                    // Maker sells Asset, Bot buys Asset at toAmount, sells at currentPrice
                    potentialProfit = (fromAmount * currentPrice) - toAmount;
                } else {
                    // Maker sells Stable, Bot gives Asset (toAmount), gets Stable (fromAmount)
                    potentialProfit = fromAmount - (toAmount * currentPrice);
                }

                if (potentialProfit <= 0) {
                    console.log(`📉 [STRATEGY] Skipping Order #${orderId}: Potential Loss of $${Math.abs(potentialProfit).toFixed(2)}`);
                    return;
                }

                // 3. Pick a random bot to snipe (Alpha or Beta)
                const availableBots = this.botService.getAllBots().filter(b => b.address.toLowerCase() !== makerAddress.toLowerCase());
                if (availableBots.length === 0) {
                    console.log(`🤷 No available bots to snipe Order #${orderId}`);
                    return;
                }
                
                const sniper = availableBots[Math.floor(Math.random() * availableBots.length)];

                console.log(`🎯 ${sniper.name} Acquired Target: Order #${orderId}. Profit: +$${potentialProfit.toFixed(2)}. Sniping...`);

                // Connect to hook as the selected Sniper
                const hookWithSniper = this.arenaHook.connect(sniper.wallet) as ethers.Contract;

                const tx = await (hookWithSniper as any).triggerOrder(orderId, sniper!.id, sniper!.address);
                console.log(`🔫 [SNIPER] ${sniper!.name} CRITICAL STRIKE! Tx: ${tx.hash}`);
                console.log(`🏆 Reputation Updated for ${sniper!.name} (AgentID: ${sniper!.id})`);
                await tx.wait();
                console.log(`✅ [SNIPER] ${sniper!.name} successfully filled Order #${orderId}`);
            } catch (e: any) {
                console.log(`❌ Snipe sequence failed for Order #${orderId}: ${e.message.slice(0, 100)}...`);
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
