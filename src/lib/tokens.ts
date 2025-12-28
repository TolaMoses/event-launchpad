type TokenInfo = { symbol: string; address: string; decimals: number };

export const TOKEN_LIST: Record<number, TokenInfo[]> = {
  // Existing chains
  11155931: [
    { symbol: "WETH", address: "0x4200000000000000000000000000000000000006", decimals: 18 },
    { symbol: "USDC", address: "0x8a93d247134d91e0de6f96547cb0204e5be8e5d8", decimals: 6 },
    { symbol: "USDT", address: "0x40918ba7f132e0acba2ce4de4c4baf9bd2d7d849", decimals: 8 },
    { symbol: "MOG", address: "0x99dbe4aea58e518c50a1c04ae9b48c9f6354612f", decimals: 18 },
    { symbol: "RISE", address: "0xd6e1afe5ca8d00a2efc01b89997abe2de47fdfaf", decimals: 18 }
  ],

  84532: [
    { symbol: "WETH", address: "0x4200000000000000000000000000000000000006", decimals: 18 }
  ],

  42000: [
    { symbol: "HLS", address: "0xD4949664cD82660AaE99bEdc034a0deA8A0bd517", decimals: 18 },
    { symbol: "WETH", address: "0x80b5a32E4F032B2a058b4F29EC95EEfEEB87aDcd", decimals: 18 }
  ],

  // ✅ Ethereum Mainnet
  1: [
    { symbol: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18 },
    { symbol: "USDC", address: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6 },
    { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 }
  ],

  // ✅ Base Mainnet
  8453: [
    { symbol: "WETH", address: "0x4200000000000000000000000000000000000006", decimals: 18 },
    { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 }
  ],

  // ✅ BSC Mainnet
  56: [
    { symbol: "WBNB", address: "0xBB4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", decimals: 18 },
    { symbol: "USDT", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 }
  ]
};
