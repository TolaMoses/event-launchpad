type TokenInfo = { symbol: string; address: string; decimals: number };

export const TOKEN_LIST: Record<number, TokenInfo[]> = {
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
  ]
};