import { ethers } from 'ethers';
import { CONFIG } from '../config.js';
import ArenaHookABI from '../abi/ArenaHook.json' with { type: 'json' };

// Uniswap v4 Swap Event Signature (Topic 0)
// event Swap(bytes32 indexed poolId, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee);
const V4_SWAP_TOPIC = '0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f';

export class ReactiveAgent {
    private provider: ethers.JsonRpcProvider;
    private wallet: ethers.Wallet;
    private arenaHook: ethers.Contract;
    private activeHumanOrders: Set<number> = new Set();

    constructor() {
        this.provider = new ethers.JsonRpcProvider(CONFIG.L2_RPC_URL);
        try {
            this.wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, this.provider) as unknown as ethers.Wallet;
        } catch (e) {
            console.warn("⚠️  Invalid PRIVATE_KEY in .env. Using Random Burner Wallet for Demo.");
            this.wallet = ethers.Wallet.createRandom(this.provider) as unknown as ethers.Wallet;
        }
        this.arenaHook = new ethers.Contract(CONFIG.L2_HOOK_ADDRESS, ArenaHookABI.abi, this.wallet);
    }

    async start() {
        console.log("🚀 Reactive Agent (The Machine) Starting...");
        console.log(`Unichain Monitoring: ${CONFIG.L2_RPC_URL}`);
        console.log(`Agent Address: ${this.wallet.address}`);

        // Initial sync of open orders
        await this.syncExistingOrders();

        this.monitorV4Swaps();
        this.monitorL2Orders();
    }

    private async syncExistingOrders() {
        console.log("🔄 Syncing existing Human orders...");
        try {
            const hook = this.arenaHook as any;
            const nextOrderId = await hook.nextOrderId();
            for (let i = 0; i < Number(nextOrderId); i++) {
                const order = await hook.orders(i);
                if (order.active && order.isHuman) {
                    this.activeHumanOrders.add(i);
                    console.log(`   Found Active Human Order #${i}`);
                }
            }
        } catch (error) {
            console.error("Failed to sync orders:", error);
        }
    }

    private async monitorV4Swaps() {
        console.log("👀 Listening for Unichain V4 Swaps (Simulation Mode)...");
        // In a real scenario, we'd listen to the PoolManager contract events here
        this.startL2Polling();
    }

    private async startL2Polling() {
        let lastBlock = await this.provider.getBlockNumber();

        setInterval(async () => {
            try {
                const currentBlock = await this.provider.getBlockNumber();
                if (currentBlock > lastBlock) {
                    console.log(`Unichain Block: ${currentBlock} | Active Orders: ${this.activeHumanOrders.size}`);
                    if (this.activeHumanOrders.size > 0) {
                        await this.checkArbitrageOpportunity();
                    }
                    lastBlock = currentBlock;
                }
            } catch (error) {
                console.error("Error polling Unichain:", error);
            }
        }, 3000); // Faster polling for Unichain
    }

    private async monitorL2Orders() {
        console.log("📡 Subscribing to L2 New Orders...");
        this.arenaHook.on('OrderPosted', (orderId, maker, isHuman, amountIn, minAmountOut) => {
            const id = Number(orderId);
            console.log(`🆕 New Order #${id} from ${maker} (Human: ${isHuman})`);

            if (isHuman) {
                this.activeHumanOrders.add(id);
                console.log("🤖 Target Acquired! Monitoring for V4 arbitrage...");
            }
        });

        this.arenaHook.on('OrderFilled', (orderId, taker, byAi) => {
            const id = Number(orderId);
            this.activeHumanOrders.delete(id);
            console.log(`✅ Order #${id} filled by ${taker} (AI: ${byAi})`);
        });
    }

    private async checkArbitrageOpportunity() {
        // For the Hackathon Demo, we simulate a "match" based on probability
        // mimicking the Sentinel detecting a V4 Swap that hits a limit price.
        const shouldSnipe = Math.random() > 0.7;

        if (shouldSnipe) {
            const orderIndex = Array.from(this.activeHumanOrders)[0];
            if (orderIndex) {
                console.log(`🎯 V4 Arbitrage detected for Order #${orderIndex}! Prompting Sentinel reaction...`);
                await this.executeSnipe(orderIndex);
            }
        }
    }

    private async executeSnipe(orderId: number) {
        console.log(`⚡ Sniping Order #${orderId}...`);
        try {
            const hook = this.arenaHook as any;
            const agentId = 1; // Default ID from deployment
            const tx = await hook.triggerOrder(orderId, agentId, this.wallet.address);
            console.log(`🔫 Trigger Tx Sent: ${tx.hash}`);
            await tx.wait();
            console.log(`✅ Snipe Confirmed! Profit secured for ${this.wallet.address}`);
            this.activeHumanOrders.delete(orderId);
        } catch (error: any) {
            if (error.message.includes("NotSentinel")) {
                console.warn(`❌ Snipe Blocked: Agent is not the authorized Sentinel on Hook.`);
                console.log(`👉 Tip: Set Sentinel on Hook to ${this.wallet.address} for manual AI demo.`);
            } else {
                console.error(`❌ Snipe Failed:`, error.message);
            }
        }
    }
}
