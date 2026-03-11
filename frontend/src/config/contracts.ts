export const UNICHAIN_SEPOLIA_CHAIN_ID = 1301;
export const REACTIVE_LASNA_CHAIN_ID = 5318007;

export const CONTRACTS = {
    [UNICHAIN_SEPOLIA_CHAIN_ID]: {
        PoolManager: "0xb65b40fc59d754ff08dacd0c2257f1e2a5a2ee38",
        AgentRegistry: "0x9db5a15aefec199b718fa4f9c8aec126ba2f9d29",
        AgentReputation: "0xe6cabd7dbab3ee8cff6206c378fa73c99893af23",
        ArenaHook: "0x7f927a09915a582Ce3142bB9D8527D0Aa7aee93C",
        MockTokens: {
            TKNA: "0x3263d3c28e2535d1bdb70e9567eec8ee2fdd40e7",
            TKNB: "0xddee18b54cc13de0e9ec85b7affbb031cc46a7f1",
        }
    },
    [REACTIVE_LASNA_CHAIN_ID]: {
        ArenaSentinel: "0xb8d533dD3c8fBE2B7cA394B9C3164a14D362Cf4d",
    }
} as const;

export const P2P_TRADING_ARENA_ADDRESSES = CONTRACTS[UNICHAIN_SEPOLIA_CHAIN_ID];
export const REACTIVE_ARENA_ADDRESSES = CONTRACTS[REACTIVE_LASNA_CHAIN_ID];
