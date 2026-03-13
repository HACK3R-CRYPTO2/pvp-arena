export const UNICHAIN_SEPOLIA_CHAIN_ID = 1301;
export const REACTIVE_LASNA_CHAIN_ID = 5318007;

export const CONTRACTS = {
    [UNICHAIN_SEPOLIA_CHAIN_ID]: {
        PoolManager: "0xB65B40FC59d754Ff08Dacd0c2257F1E2a5a2eE38",
        AgentRegistry: "0x94177286736a0d8966bb0b6a8ff4587bce01d359",
        AgentReputation: "0x38329a436f2756c388690f12398567cacd2b5d33",
        ArenaHook: "0x52d3ee769225b499282e21c9582bd3ff4c426310",
        MockTokens: {
            TKNA: "0x3263d3c28e2535d1bdb70e9567eec8ee2fdd40e7",
            TKNB: "0xddee18b54cc13de0e9ec85b7affbb031cc46a7f1",
        }
    },
    [REACTIVE_LASNA_CHAIN_ID]: {
        ArenaSentinel: "0x4F47D6843095F3b53C67B02C9B72eB1d579051ba",
    }
} as const;

export const P2P_TRADING_ARENA_ADDRESSES = CONTRACTS[UNICHAIN_SEPOLIA_CHAIN_ID];
export const REACTIVE_ARENA_ADDRESSES = CONTRACTS[REACTIVE_LASNA_CHAIN_ID];
