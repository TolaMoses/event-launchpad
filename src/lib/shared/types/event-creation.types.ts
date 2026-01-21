/**
 * Event Creation Types
 * 
 * Extracted from create-event page for better modularity
 */

export type NftInput = {
  id: string;
  contract: string;
  tokenId: string;
};

export type PositionReward = {
  position: number;
  amount: string;
};

export type MintableNft = {
  id: string;
  name: string;
  description: string;
  imageFile: File | null;
  imagePreview: string;
  supply: string;
  rarity: string;
  rarityPercentage: string;
  uploadedImage: UploadedAsset | null;
};

export type NftDistributionPosition = {
  position: number;
  nftId: string; // references nft.id or mintableNft.id
};

export type RewardConfig = {
  id: string;
  type: string; // "Token", "ETH", "NFT", etc.
  // Token/ETH specific
  chain?: string;
  tokenAddress?: string;
  prizePool?: string;
  distributionType?: "even" | "custom";
  positionRewards?: PositionReward[];
  customTokenSymbol?: string;
  customTokenAddress?: string;
  customTokenDecimals?: string;
  // NFT specific
  nfts?: NftInput[];
  nftDistributionType?: "even" | "custom";
  nftPositionDistribution?: NftDistributionPosition[];
  // Mintable NFT specific
  mintableNfts?: MintableNft[];
  mintableNftDistributionType?: "random" | "custom";
  mintableNftPositionDistribution?: NftDistributionPosition[];
  // Gift specific
  giftDescription?: string;
  giftValue?: string;
  // Voucher specific
  voucherDescription?: string;
  voucherCodes?: string[];
  // Custom Points specific
  customPointName?: string;
  leaderboardEnabled?: boolean;
};

export type UploadKind = "banner" | "logo" | "nft";

export type UploadedAsset = {
  path: string;
  publicUrl: string;
};

export type EventType = "quick_event" | "community" | "";

export type Task = {
  id: string;
  type: string;
  title: string;
  points: number;
  config: Record<string, any>;
};

export type PrizeOption = {
  value: string;
  label: string;
};

export type ChainOption = {
  id: string;
  label: string;
};
