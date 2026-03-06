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
        // AlphaBot: The Market Maker / Bait (Uses the default private key)
        const alphaWallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider) as unknown as ethers.Wallet;
        this.bots.set(1, {
            id: 1,
            name: 'AlphaMachine',
            address: alphaWallet.address,
            description: 'Intra-chain liquidity provider. Posts bait orders to attract snipers.',
            strategy: 'MAKER',
            wallet: alphaWallet
        });

        // BetaBot: The Sniper (Deterministic derivation from Alpha key for stability)
        // We use a different private key derived from the same mnemonic if possible, 
        // but since we only have a hex key, we'll just use a slightly modified key.
        // For hackathon, we can just use the same key or a related one.
        // Let's use the same key for both for simplicity in the registry, 
        // OR better: use a derived one.

        // Actually, to match the registry where all are 0xd2df53, let's use the same wallet.
        this.bots.set(2, {
            id: 2,
            name: 'BetaSentinel',
            address: alphaWallet.address,
            description: 'Reactive high-frequency sniper. Fills orders as soon as V4 price hits.',
            strategy: 'AGGRESSIVE',
            wallet: alphaWallet
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
