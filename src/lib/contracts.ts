// src/lib/contracts.ts
import raffleAbi from "$lib/abi/Raffle.json";
import rewardVaultAbi from "$lib/abi/RewardVault.json";

export const CONTRACTS: Record<number, { name: string; raffle: string; rewardVault: string }> = {
  84532: { // Base Testnet
    name: "Base Testnet",
    raffle: "0xRaffleOnMainnet",
    rewardVault: "0x2a2875eDEe2f130207b819500f4f6de191bb0D64"
  },
  11155111: { // Sepolia Testnet
    name: "Sepolia Testnet",
    raffle: "0xRaffleOnSepolia",
    rewardVault: "0xEntropyOnSepolia"
  },
  42000: { // Helios Testnet
    name: "Helios Testnet",
    raffle: "0x5a1e8cbeb19b8D3da5979595f0a4b4F2Ef10F3C9",
    rewardVault: "0x2a2875eDEe2f130207b819500f4f6de191bb0D64"
  },
  11155931: { // Rise Testnet
    name: "Rise Testnet",
    raffle: "0x6ec5c8F8351e71EB3743bbEB74E0553eaCe1bBA6",
    rewardVault: "0x8Cd9d6016A28aa6bcE022092D0ebd1CF0A2C45c8"
  }
};

export const ABIS = {
  raffle: raffleAbi,
  rewardVault: rewardVaultAbi
};