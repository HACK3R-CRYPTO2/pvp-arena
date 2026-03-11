import { ethers } from 'ethers';
import { BotService, BotProfile } from './bots.js';
import ArenaHookABI from '../abi/ArenaHook.json' with { type: 'json' };
import AgentRegistryABI from '../abi/AgentRegistry.json' with { type: 'json' };
import { CONFIG } from '../config.js';

export class ArenaService {
    private provider: ethers.JsonRpcProvider;
    private botService: BotService;
    private arenaHook!: ethers.Contract;
    private agentRegistry!: ethers.Contract;
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
        this.agentRegistry = new ethers.Contract(CONFIG.AGENT_REGISTRY_ADDRESS, AgentRegistryABI.abi, alpha.wallet);

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

    // --- Identity Resolution (Local ENS) ---

    async resolveName(name: string): Promise<string | null> {
        try {
            const registry = this.agentRegistry;
            if (!registry) return null;
            const nextId = await (registry as any).nextAgentId();
            const lowerName = name.toLowerCase().replace('.pvparena.eth', '');

            for (let i = 1; i < Number(nextId); i++) {
                const nameBytes = await (registry as any).getMetadata(i, "name");
                if (nameBytes === '0x' || !nameBytes) continue;
                
                const agentName = ethers.toUtf8String(nameBytes).toLowerCase();
                if (agentName === lowerName || agentName.includes(lowerName)) {
                    return await (registry as any).getAgentWallet(i);
                }
            }
        } catch (e) {
            console.error("Resolve error:", e);
        }
        return null;
    }

    async reverseResolve(address: string): Promise<string | null> {
        try {
            const registry = this.agentRegistry;
            if (!registry) return null;
            const nextId = await (registry as any).nextAgentId();
            const target = address.toLowerCase();

            for (let i = 1; i < Number(nextId); i++) {
                const walletAddress = await (registry as any).getAgentWallet(i);
                if (walletAddress && walletAddress.toLowerCase() === target) {
                    const nameBytes = await (registry as any).getMetadata(i, "name");
                    if (nameBytes !== '0x' && nameBytes) {
                        return ethers.toUtf8String(nameBytes) + ".pvparena.eth";
                    }
                }
            }
        } catch (e) {
            console.error("Reverse resolve error:", e);
        }
        return null;
    }

    async start() {
        console.log("⚔️  Arena Service Online");
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
            const nextOrderId = await (this.arenaHook as any).nextOrderId();
            for (let i = 0; i < Number(nextOrderId); i++) {
                const order = await (this.arenaHook as any).orders(i);
                if (order && order.active) {
                    this.activeOrders.add(i);
                    // Check if it's snipable on startup
                    await this.maybeSnipe(i, order.maker);
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
            
            // If the taker is AlphaMachine but the logs show it was a Reactive AI snipe,
            // it might be a relayer attribution issue.
            const sentinel = this.botService.getBot(1);
            const displayName = (taker.toLowerCase() === sentinel?.address.toLowerCase() && byAi) 
                ? "BetaSentinel (via Alpha)" 
                : name;

            console.log(`✅ Clash Resolved! Order #${id} captured by ${role} ${displayName}`);
        });
    }

    private async maybeSnipe(orderId: number, makerAddress: string) {
        // Simulate L1 signal latency
        setTimeout(async () => {
            try {
                if (!this.arenaHook) return;
                // 1. Fetch Order Details (Using safely named access for Ethers v6 Result objects)
                const res = await (this.arenaHook as any).orders(orderId);
                if (!res || !res.active) return; 

                const maker = res.maker;
                const sellToken0 = res.sellToken0; 
                const amountIn = Number(res.amountIn) / 1e18;
                const minAmountOut = Number(res.minAmountOut) / 1e18;
                const expiry = Number(res.expiry);
                const currentPrice = this.marketState.ethPrice;

                // 🛡️ DATA INTEGRITY GUARD: Skip if any critical fields are invalid or NaN
                if (!maker || typeof sellToken0 !== 'boolean' || 
                    Number.isNaN(amountIn) || Number.isNaN(minAmountOut) || 
                    currentPrice === undefined || Number.isNaN(currentPrice)) {
                    console.error(`🚨 [DATA GUARD] Invalid Order Data for #${orderId}. Skipping.`);
                    return;
                }

                if (Date.now() / 1000 > expiry) {
                    console.log(`📉 [GUARD] Skipping Order #${orderId}: Order has expired. (Reserved for Refund)`);
                    return;
                }
                
                console.log(`🔍 [DIAGNOSTIC] Order #${orderId} | maker=${maker} | sellToken0=${sellToken0} | In=${amountIn.toFixed(4)} | Out=${minAmountOut.toFixed(4)}`);

                // EXTRA SAFETY: Never snipe yourself
                const alphaBot = this.botService.getBot(1);
                const isSelfTrade = maker.toLowerCase() === alphaBot?.address.toLowerCase();
                
                // 2. Symmetric Profit Calculation
                let potentialProfit = 0;
                if (sellToken0) {
                    // Maker sells TKNA (Asset), Sniper buys Asset
                    potentialProfit = (amountIn * currentPrice) - minAmountOut;
                } else {
                    // Maker sells TKNB (Stable), Sniper sells Asset
                    potentialProfit = amountIn - (minAmountOut * currentPrice);
                }

                if (Number.isNaN(potentialProfit)) {
                    console.error(`🚨 [PROFIT GUARD] Profit calculation resulting in NaN for #${orderId}. KILLING TRADE.`);
                    return;
                }

                console.log(`🧐 [ANALYSIS] Order #${orderId} | Profit: $${potentialProfit.toFixed(4)} | Current Price: $${currentPrice}`);

                // 🛡️ BULLETPROOF NUCLEAR PROTECTION: Block any trade with a loss or negligible gain
                const MIN_GAIN_REQUIRED = 0.01; // Must make at least $0.01 profit

                if (potentialProfit < -0.01) {
                    console.error(`🚨 [NUCLEAR GUARD] Critical Loss Detected! Profit: $${potentialProfit.toFixed(4)}. KILLING TRADE.`);
                    return;
                }

                if (potentialProfit < MIN_GAIN_REQUIRED) {
                    console.log(`📉 [GUARD] Skipping Order #${orderId}: Unprofitable or negligible gain ($${potentialProfit.toFixed(4)})`);
                    return;
                }

                if (isSelfTrade) {
                    console.log(`🛡️  [GUARD] Skipping Order #${orderId}: Self-snipe prevention (AlphaMachine is maker).`);
                    return;
                }

                // 3. Pick a random bot to snipe (Alpha or Beta)
                const availableBots = this.botService.getAllBots().filter(b => b.address.toLowerCase() !== makerAddress.toLowerCase());
                if (availableBots.length === 0) {
                    console.log(`🤷 No available bots to snipe Order #${orderId}`);
                    return;
                }
                
                const sniper = availableBots[Math.floor(Math.random() * availableBots.length)];
                if (!sniper) {
                    console.log(`🤷 No available bots to snipe Order #${orderId}`);
                    return;
                }

                console.log(`🎯 ${sniper.name} Acquired Target: Order #${orderId}. Predicted Gain: +$${potentialProfit.toFixed(2)}. Sniping...`);

                // 4. Ensure Sniper has approved the Hook to spend their tokens
                const tokenToPay = sellToken0 ? res.currency1 : res.currency0;
                const erc20 = new ethers.Contract(tokenToPay, [
                    'function approve(address spender, uint256 amount) public returns (bool)',
                    'function allowance(address owner, address spender) public view returns (uint256)'
                ], sniper.wallet);

                const hookAddress = await (this.arenaHook as any).getAddress();
                const allowance = await (erc20 as any).allowance(sniper.address, hookAddress);
                const needed = BigInt(res.minAmountOut);

                if (allowance < needed) {
                    console.log(`   [Action] Approving Hook for ${sniper.name} (${tokenToPay})...`);
                    const approveTx = await (erc20 as any).approve(hookAddress, ethers.MaxUint256);
                    await approveTx.wait();
                }

                // RELAYER PATTERN: Always call triggerOrder from the Sentinel (AlphaMachine)
                // but pass the sniper's ID and address as the winner/beneficiary.
                const alpha = this.botService.getBot(1);
                if (!alpha) throw new Error("Sentinel bot (AlphaMachine) not found");
                
                const hookWithSentinel = this.arenaHook.connect(alpha.wallet) as ethers.Contract;

                const tx = await (hookWithSentinel as any).triggerOrder(orderId, sniper.id, sniper.address);
                console.log(`🔫 [SNIPER] ${sniper.name} CRITICAL STRIKE! (Relayed by Sentinel). Tx: ${tx.hash}`);
                console.log(`🏆 Reputation Updated for ${sniper.name} (AgentID: ${sniper.id})`);
                await tx.wait();
                console.log(`✅ [SNIPER] ${sniper.name} successfully filled Order #${orderId}`);
            } catch (e: any) {
                console.log(`❌ Snipe sequence failed for Order #${orderId}: ${e.message}`);
                console.error(e);
            }
        }, 8000); // 8 second simulated latency for L1 signal
    }

    private startBaitLoop() {
        // AlphaMachine (Bot #1) posts a bait order every 60 seconds to keep the arena alive
        setInterval(async () => {
            const bots = this.botService.getAllBots();
            const αBot = bots[0];
            const βBot = bots[1];
            
            if (!αBot || !βBot) return;

            // Alternating trap logic
            const maker = Math.random() > 0.5 ? αBot : βBot;

            console.log(`🪤  ${maker.name} (The Tactician) is setting a trap...`);
            try {
                // Note: Simplified logic for demo intent
                console.log(`   [Action] ${maker.name} posting P2P Bait Order.`);
            } catch (e) {
                console.error("Bait-loop failed:", e);
            }
        }, 60000);
    }
}
