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
        if (!CONFIG.PRIVATE_KEY) {
            console.error("❌ Fatal: PRIVATE_KEY not found in CONFIG");
            return;
        }

        // AlphaBot: AgentID 1 - Uses the main private key
        const alphaWallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
        this.bots.set(1, {
            id: 1,
            name: 'AlphaMachine',
            address: alphaWallet.address,
            description: 'Intra-chain liquidity provider. Posts bait orders to attract snipers.',
            strategy: 'MAKER',
            wallet: alphaWallet
        });

        // BetaBot: AgentID 2 - USES A DERIVED KEY
        const betaKey = ethers.keccak256(ethers.toUtf8Bytes(CONFIG.PRIVATE_KEY + "beta"));
        const betaWallet = new ethers.Wallet(betaKey, provider);
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

    async getBotAssets(address: string) {
        const addr = address.toLowerCase();
        const provider = this.bots.get(1)?.wallet.provider;
        
        if (!provider) return { assets: [], totalUSD: 0 };

        // TKNA / TKNB on Unichain Sepolia
        const TKNA_ADDR = '0x3263d3c28e2535d1bdb70e9567eec8ee2fdd40e7';
        const TKNB_ADDR = '0xddee18b54cc13de0e9ec85b7affbb031cc46a7f1';
        
        const erc20Abi = ["function balanceOf(address) view returns (uint256)"];
        const tknA = new ethers.Contract(TKNA_ADDR, erc20Abi, provider);
        const tknB = new ethers.Contract(TKNB_ADDR, erc20Abi, provider);
        
        try {
            const [ethBal, tknABal, tknBBal] = await Promise.all([
                provider!.getBalance(addr),
                (tknA as any).balanceOf(addr).catch(() => 0n),
                (tknB as any).balanceOf(addr).catch(() => 0n)
            ]);

            const ETH_PRICE = 3000;
            const TKN_PRICE = 10; 

            const assets = [
                {
                    chainId: 1301,
                    symbol: 'ETH',
                    name: 'Ether',
                    amountFormatted: ethers.formatEther(ethBal || 0n),
                    priceUSD: ETH_PRICE.toString(),
                    valueUSD: parseFloat(ethers.formatEther(ethBal || 0n)) * ETH_PRICE
                },
                {
                    chainId: 1301,
                    symbol: 'TKNA',
                    name: 'Token A',
                    amountFormatted: ethers.formatEther(tknABal || 0n),
                    priceUSD: TKN_PRICE.toString(),
                    valueUSD: parseFloat(ethers.formatEther(tknABal || 0n)) * TKN_PRICE
                },
                {
                    chainId: 1301,
                    symbol: 'TKNB',
                    name: 'Token B',
                    amountFormatted: ethers.formatEther(tknBBal || 0n),
                    priceUSD: TKN_PRICE.toString(),
                    valueUSD: parseFloat(ethers.formatEther(tknBBal || 0n)) * TKN_PRICE
                }
            ].filter(a => parseFloat(a.amountFormatted) > 0);

            const totalUSD = assets.reduce((sum, a) => sum + a.valueUSD, 0);

            return { assets, totalUSD };
        } catch (e) {
            console.error('Error fetching bot assets:', e);
            return { assets: [], totalUSD: 0 };
        }
    }
}
