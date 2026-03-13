import { BotProfile } from './bots.js';

export interface MarketState {
    ethPrice: number;
    volatility: number;
    lastUpdate: number;
}

/**
 * @title StrategyService
 * @notice Pure logic service for analyzing profit margins and selecting snipers
 */
export class StrategyService {
    private minProfitUSD: number = 0.01;

    /**
     * @notice Generates a deterministic simulated price for a given block
     * @param blockNumber The blockchain block number
     * @returns The simulated ETH price in USD
     */
    public getSimulatedPrice(blockNumber: number): number {
        // Base price 3000 with a $100 oscillation every ~100 blocks
        // 100 blocks on Unichain (1s blocks) is ~1.5 mins
        const baseline = 3000;
        const amplitude = 50;
        const period = 100;
        const oscillation = Math.sin(blockNumber / period) * amplitude;
        return parseFloat((baseline + oscillation).toFixed(2));
    }

    /**
     * @notice Calculates symmetric profit for an order
     * @param amountIn Amount the maker is selling
     * @param minAmountOut Minimum amount the maker expects
     * @param sellToken0 True if maker is selling token0
     * @param ethPrice Current market price of ETH in USD
     * @returns The potential profit in USD
     */
    public calculateProfit(
        amountIn: number,
        minAmountOut: number,
        sellToken0: boolean,
        ethPrice: number
    ): number {
        if (sellToken0) {
            // Maker sells TKNA (Asset), Sniper buys Asset
            return (amountIn * ethPrice) - minAmountOut;
        } else {
            // Maker sells TKNB (Stable), Sniper sells Asset
            return amountIn - (minAmountOut * ethPrice);
        }
    }

    /**
     * @notice Validates if a trade is profitable and safe
     * @param potentialProfit Pre-calculated profit
     * @returns True if trade meets safety thresholds
     */
    public isSafeToTrade(potentialProfit: number): boolean {
        if (potentialProfit < -0.01) return false; // Critical loss protection
        return potentialProfit >= this.minProfitUSD;
    }

    /**
     * @notice Selects the optimal sniper bot for an order
     * @param makerAddress Address of the order maker
     * @param bots Array of available bot profiles
     * @returns The selected sniper bot or null if no valid sniper found
     */
    public selectSniper(makerAddress: string, bots: BotProfile[]): BotProfile | null {
        const addr = makerAddress.toLowerCase();
        
        // Find bots that aren't the maker
        const options = bots.filter(b => b.address.toLowerCase() !== addr);
        
        if (options.length === 0) return null;

        // Strategy: Match Alpha vs Beta or pick Beta for humans (default strategy)
        const beta = options.find(b => b.id === 2);
        const alpha = options.find(b => b.id === 1);

        if (addr === alpha?.address.toLowerCase()) return beta || null;
        if (addr === beta?.address.toLowerCase()) return alpha || null;

        // Default to Beta (Aggressive strategy) for non-bot makers
        return beta || alpha || null;
    }
}
