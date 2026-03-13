import { ethers } from 'ethers';
import { BotService, BotProfile } from './bots.js';
import ArenaHookABI from '../abi/ArenaHook.json' with { type: 'json' };
import AgentRegistryABI from '../abi/AgentRegistry.json' with { type: 'json' };
import { CONFIG } from '../config.js';
import { EventService } from './EventService.js';
import { StrategyService, MarketState } from './StrategyService.js';
import { TxManager } from './TxManager.js';

export class ArenaService {
    private provider: ethers.JsonRpcProvider;
    private botService: BotService;
    private eventService!: EventService;
    private strategyService: StrategyService;
    private txManager: TxManager;
    
    private arenaHook!: ethers.Contract;
    private agentRegistry!: ethers.Contract;
    
    private activeOrders: Set<number> = new Set();
    private marketState: MarketState = {
        ethPrice: 3000.00,
        volatility: 0.05,
        lastUpdate: Date.now()
    };

    constructor(provider: ethers.JsonRpcProvider, botService: BotService, hookAddress: string) {
        this.provider = provider;
        this.botService = botService;
        this.strategyService = new StrategyService();
        this.txManager = new TxManager();

        const alpha = botService.getBot(1);
        if (!alpha) throw new Error("AlphaBot not found");

        this.arenaHook = new ethers.Contract(hookAddress, ArenaHookABI.abi, alpha.wallet);
        this.agentRegistry = new ethers.Contract(CONFIG.AGENT_REGISTRY_ADDRESS, AgentRegistryABI.abi, alpha.wallet);

        // Sub-services initialization happens in start() to ensure block state is ready
    }

    private async startMarketSimulation() {
        // Sync initial state
        const block = await this.provider.getBlockNumber();
        this.updateMarketState(block);

        // Update on every block
        this.provider.on('block', (blockNumber) => {
            this.updateMarketState(blockNumber);
        });
    }

    private updateMarketState(blockNumber: number) {
        this.marketState.ethPrice = this.strategyService.getSimulatedPrice(blockNumber);
        // Volatility is also deterministic based on block to keep things synced
        const volBase = Math.abs(Math.sin(blockNumber / 50) * 2);
        this.marketState.volatility = parseFloat(volBase.toFixed(2));
        this.marketState.lastUpdate = Date.now();
    }

    public getMarketState() {
        return this.marketState;
    }

    private nameCache: Map<string, string> = new Map();
    private addressCache: Map<string, string> = new Map();

    async resolveName(name: string): Promise<string | null> {
        const lowerName = name.toLowerCase().replace('.pvparena.eth', '');
        if (this.nameCache.has(lowerName)) return this.nameCache.get(lowerName)!;

        try {
            const registry = this.agentRegistry;
            const nextId = await (registry as any).nextAgentId();
            
            // Limit search for performance
            const maxId = Math.min(Number(nextId), 20);

            for (let i = 1; i < maxId; i++) {
                const nameBytes = await (registry as any).getMetadata(i, "name");
                if (!nameBytes || nameBytes === '0x') continue;
                
                const agentName = ethers.toUtf8String(nameBytes).toLowerCase();
                if (agentName === lowerName || agentName.includes(lowerName)) {
                    const wallet = await (registry as any).getAgentWallet(i);
                    this.nameCache.set(lowerName, wallet);
                    return wallet;
                }
            }
        } catch (e) {
            console.error("Resolve error:", e);
        }
        return null;
    }

    async reverseResolve(address: string): Promise<string | null> {
        const target = address.toLowerCase();
        if (this.addressCache.has(target)) return this.addressCache.get(target)!;

        try {
            const registry = this.agentRegistry;
            const nextId = await (registry as any).nextAgentId();
            const maxId = Math.min(Number(nextId), 20);

            for (let i = 1; i < maxId; i++) {
                const walletAddress = await (registry as any).getAgentWallet(i);
                if (walletAddress && walletAddress.toLowerCase() === target) {
                    const nameBytes = await (registry as any).getMetadata(i, "name");
                    if (nameBytes && nameBytes !== '0x') {
                        const name = ethers.toUtf8String(nameBytes) + ".pvparena.eth";
                        this.addressCache.set(target, name);
                        return name;
                    }
                }
            }
        } catch (e) {
            console.error("Reverse resolve error:", e);
        }
        return null;
    }

    async start() {
        console.log("⚔️  Arena Service Online (Modular v2)");
        console.log("------------------------------------------");
        
        await this.fundBots();
        
        // Ensure bots are registered in AgentRegistry
        const bots = this.botService.getAllBots();
        for (const bot of bots) {
            try {
                const walletAddr = await (this.agentRegistry as any).getAgentWallet(bot.id);
                if (walletAddr === ethers.ZeroAddress) {
                    console.log(`🆔 [IDENT-REG] Registering ${bot.name} (Agent #${bot.id})...`);
                    const registryWithBot = new ethers.Contract(CONFIG.AGENT_REGISTRY_ADDRESS, AgentRegistryABI.abi, bot.wallet);
                    const tx = await (registryWithBot as any).register();
                    await tx.wait();
                    
                    // Set metadata (name)
                    const nameBytes = ethers.toUtf8Bytes(bot.name.replace('.pvparena.eth', ''));
                    await (registryWithBot as any).setMetadata(bot.id, "name", nameBytes);
                    
                    console.log(`✅ [IDENT-REG] ${bot.name} successfully registered and configured.`);
                }
            } catch (e) {
                console.error(`❌ [IDENT-REG] Failed to register ${bot.name}:`, e);
            }
        }
        
        const latestBlock = await this.provider.getBlockNumber();
        this.eventService = new EventService(
            this.provider,
            this.arenaHook.target as string,
            ArenaHookABI.abi,
            latestBlock
        );

        // Wire up listeners
        this.eventService.on('OrderPosted', (ev) => {
            if (!this.activeOrders.has(ev.orderId)) {
                this.activeOrders.add(ev.orderId);
                const bot = this.botService.getBotByAddress(ev.maker);
                const name = bot ? bot.name : (ev.isHuman ? "Human" : "Robot");
                console.log(`🆕 [EVENT] ${name} Posted Order #${ev.orderId}`);
                this.maybeSnipe(ev.orderId, ev.maker);
            }
        });

        this.eventService.on('OrderFilled', (ev) => {
            this.activeOrders.delete(ev.orderId);
            const bot = this.botService.getBotByAddress(ev.taker);
            const name = bot ? bot.name : "Unknown";
            const role = ev.byAi ? "[SNIPER]" : "[TAKER]";
            console.log(`✅ Clash Resolved! Order #${ev.orderId} captured by ${role} ${name}`);
        });

        this.eventService.start();
        this.startMarketSimulation();
        
        // Initial Sync
        await this.syncOrders();
        
        console.log(`📡 [SYNC] Arena fully synchronized with ${this.activeOrders.size} orders.`);
    }

    private async syncOrders() {
        try {
            const nextOrderId = await (this.arenaHook as any).nextOrderId();
            for (let i = 0; i < Number(nextOrderId); i++) {
                const order = await (this.arenaHook as any).orders(i);
                if (order && order.active && !this.activeOrders.has(i)) {
                    this.activeOrders.add(i);
                    // Check if it's snipable on startup (staggered to avoid nonce/gas collisions)
                    setTimeout(() => this.maybeSnipe(i, order.maker), i * 2000);
                }
            }
            console.log(`📡 Linked to Hook at ${this.arenaHook.target}. Found ${this.activeOrders.size} active orders.`);
        } catch (e) {
            console.error("Failed to sync orders:", e);
        }
    }

    private async fundBots() {
        const bots = this.botService.getAllBots();
        const alpha = bots.find(b => b.id === 1);
        const beta = bots.find(b => b.id === 2);
        
        if (!alpha || !beta) return;

        try {
            const ethBalance = await this.provider.getBalance(beta.address);
            if (ethBalance < ethers.parseEther("0.05")) {
                console.log(`💰 [FUNDING] BetaSentinel is low on Gas. AlphaMachine sending 0.1 ETH...`);
                const tx = await alpha.wallet.sendTransaction({
                    to: beta.address,
                    value: ethers.parseEther("0.1")
                });
                await tx.wait();
            }

            // Ensure Beta has some TKNA/TKNB for baiting/sniping
            const tkna = new ethers.Contract(CONFIG.MOCK_TKNA_ADDRESS, [
                'function balanceOf(address) view returns (uint256)',
                'function transfer(address, uint256) returns (bool)'
            ], alpha.wallet);
            const tknb = new ethers.Contract(CONFIG.MOCK_TKNB_ADDRESS, [
                'function balanceOf(address) view returns (uint256)',
                'function transfer(address, uint256) returns (bool)'
            ], alpha.wallet);

            const betaTkna = await (tkna as any).balanceOf(beta.address);
            if (betaTkna < ethers.parseUnits("5", 18)) {
                console.log(`💰 [FUNDING] BetaSentinel is low on TKNA. AlphaMachine sending 10 TKNA...`);
                await (await (tkna as any).transfer(beta.address, ethers.parseUnits("10", 18))).wait();
            }

            const betaTknb = await (tknb as any).balanceOf(beta.address);
            if (betaTknb < ethers.parseUnits("5", 18)) {
                console.log(`💰 [FUNDING] BetaSentinel is low on TKNB. AlphaMachine sending 10 TKNB...`);
                await (await (tknb as any).transfer(beta.address, ethers.parseUnits("10", 18))).wait();
            }
        } catch (e) {
            console.error("Funding check failed:", e);
        }
    }


    private async maybeSnipe(orderId: number, makerAddress: string) {
        setTimeout(async () => {
            try {
                const res = await (this.arenaHook as any).orders(orderId);
                if (!res || !res.active) return;

                const amountIn = Number(res.amountIn) / 1e18;
                const minAmountOut = Number(res.minAmountOut) / 1e18;
                const expiry = Number(res.expiry);
                const sellToken0 = res.sellToken0;

                const profit = this.strategyService.calculateProfit(
                    amountIn,
                    minAmountOut,
                    sellToken0,
                    this.marketState.ethPrice
                );

                if (!this.strategyService.isSafeToTrade(profit)) {
                    console.log(`📉 [GUARD] Order #${orderId} analysis: Unprofitable ($${profit.toFixed(4)}) or unsafe.`);
                    return;
                }

                if (Date.now() / 1000 > expiry) return;

                const sniper = this.strategyService.selectSniper(makerAddress, this.botService.getAllBots());
                if (!sniper) return;

                console.log(`🎯 ${sniper.name} Sniping Order #${orderId} (Profit: $${profit.toFixed(2)})`);

                // Check and Approve if needed
                const tokenToPay = sellToken0 ? res.currency1 : res.currency0;
                const erc20 = new ethers.Contract(tokenToPay, [
                    'function approve(address, uint256) public returns (bool)',
                    'function allowance(address, address) public view returns (uint256)'
                ], sniper.wallet);

                const hookAddr = this.arenaHook.target as string;
                const allowance = await (erc20 as any).allowance(sniper.address, hookAddr);
                if (allowance < BigInt(res.minAmountOut)) {
                    await (erc20 as any).approve(hookAddr, ethers.MaxUint256);
                }

                // Relayer Execution via TxManager
                const alpha = this.botService.getBot(1);
                if (!alpha) return;

                const txData = this.arenaHook.interface.encodeFunctionData('triggerOrder', [
                    orderId,
                    sniper.id,
                    sniper.address
                ]);

                const tx = await this.txManager.sendTransaction(sniper.wallet, {
                    to: hookAddr,
                    data: txData
                });

                console.log(`🔫 [SNIPER] STRIKE! Tx: ${tx.hash}`);
                await tx.wait();
            } catch (e: any) {
                console.error(`❌ Snipe failed for #${orderId}:`, e.message);
            }
        }, 8000);
    }


}
