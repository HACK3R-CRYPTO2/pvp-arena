import { ethers } from 'ethers';
import { CONFIG } from '../config.js';

export interface BotProfile {
    id: number;
    name: string;
    address: string;
    description: string;
    strategy: 'AGGRESSIVE' | 'PASSIVE' | 'MAKER';
    wallet: ethers.Wallet;
}

export class BotService {
    private bots: Map<number, BotProfile> = new Map();

    constructor(provider: ethers.JsonRpcProvider) {
        // AlphaBot: AgentID 1 - Uses the main private key
        const alphaWallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider) as unknown as ethers.Wallet;
        this.bots.set(1, {
            id: 1,
            name: 'AlphaMachine',
            address: alphaWallet.address,
            description: 'Intra-chain liquidity provider. Posts bait orders to attract snipers.',
            strategy: 'MAKER',
            wallet: alphaWallet
        });

        // BetaBot: AgentID 2 - USES A DERIVED KEY (Matching the registration script)
        const betaKey = ethers.keccak256(ethers.toUtf8Bytes(CONFIG.PRIVATE_KEY + "beta"));
        const betaWallet = new ethers.Wallet(betaKey, provider) as unknown as ethers.Wallet;
        this.bots.set(2, {
            id: 2,
            name: 'BetaSentinel',
            address: betaWallet.address,
            description: 'Reactive high-frequency sniper. Fills orders based on L1 signals.',
            strategy: 'AGGRESSIVE',
            wallet: betaWallet
        });
    }

    getBot(id: number): BotProfile | undefined {
        return this.bots.get(id);
    }

    getAllBots(): BotProfile[] {
        return Array.from(this.bots.values());
    }

    getBotByAddress(address: string): BotProfile | undefined {
        const addr = address.toLowerCase();
        return this.getAllBots().find(b => b.address.toLowerCase() === addr);
    }
}
