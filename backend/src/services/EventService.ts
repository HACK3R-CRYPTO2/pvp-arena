import { ethers } from 'ethers';
import { EventEmitter } from 'events';

export interface OrderPostedEvent {
    orderId: number;
    maker: string;
    isHuman: boolean;
    amountIn: bigint;
    minAmountOut: bigint;
}

export interface OrderFilledEvent {
    orderId: number;
    taker: string;
    byAi: boolean;
}

/**
 * @title EventService
 * @notice Handles blockchain event polling and emits typed events for other services
 */
export class EventService extends EventEmitter {
    private provider: ethers.JsonRpcProvider;
    private arenaHook: ethers.Contract;
    private lastProcessedBlock: number;
    private pollingInterval: number;
    private timer: NodeJS.Timeout | null = null;

    constructor(
        provider: ethers.JsonRpcProvider,
        hookAddress: string,
        hookAbi: any,
        startBlock: number,
        intervalMs: number = 8000
    ) {
        super();
        this.provider = provider;
        this.arenaHook = new ethers.Contract(hookAddress, hookAbi, provider);
        this.lastProcessedBlock = startBlock;
        this.pollingInterval = intervalMs;
    }

    /**
     * @notice Starts the event polling loop
     */
    public start() {
        if (this.timer) return;
        console.log(`📡 [EventService] Polling started from block ${this.lastProcessedBlock}`);
        this.timer = setInterval(() => this.poll(), this.pollingInterval);
    }

    /**
     * @notice Stops the event polling loop
     */
    public stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    private async poll() {
        try {
            const latestBlock = await this.provider.getBlockNumber();
            if (latestBlock <= this.lastProcessedBlock) return;

            // Cap the polling range to 1000 blocks to avoid RPC timeouts
            const fromBlock = this.lastProcessedBlock + 1;
            const toBlock = Math.min(latestBlock, fromBlock + 1000);

            // 1. Poll OrderPosted
            const postedLogs = await (this.arenaHook as any).queryFilter(
                (this.arenaHook as any).filters.OrderPosted(),
                fromBlock,
                toBlock
            );

            for (const log of (postedLogs as any[])) {
                if (log.args) {
                    const [orderId, maker, isHuman, amountIn, minAmountOut] = log.args;
                    this.emit('OrderPosted', {
                        orderId: Number(orderId),
                        maker,
                        isHuman,
                        amountIn,
                        minAmountOut
                    } as OrderPostedEvent);
                }
            }

            // 2. Poll OrderFilled
            const filledLogs = await (this.arenaHook as any).queryFilter(
                (this.arenaHook as any).filters.OrderFilled(),
                fromBlock,
                toBlock
            );

            for (const log of (filledLogs as any[])) {
                if (log.args) {
                    const [orderId, taker, byAi] = log.args;
                    this.emit('OrderFilled', {
                        orderId: Number(orderId),
                        taker,
                        byAi
                    } as OrderFilledEvent);
                }
            }

            this.lastProcessedBlock = toBlock;

        } catch (e: any) {
            if (e.message?.includes('filter not found')) return;
            console.error(`🚨 [EventService] Polling error [Block ${this.lastProcessedBlock}]:`, e.message);
        }
    }

    public async getActiveOrdersFromChain(): Promise<number[]> {
        const nextId = await (this.arenaHook as any).nextOrderId();
        const activeIds: number[] = [];
        for (let i = 0; i < Number(nextId); i++) {
            const order = await (this.arenaHook as any).orders(i);
            if (order && order.active) activeIds.push(i);
        }
        return activeIds;
    }
}
