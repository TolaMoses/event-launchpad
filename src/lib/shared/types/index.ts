/**
 * Shared TypeScript types for the entire application
 * This is the single source of truth for domain types
 */

// ==================== USER TYPES ====================

export interface User {
  id: string;
  email: string;
  username: string | null;
  wallet_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  bio?: string;
  avatar_url?: string;
  twitter_username?: string;
  discord_username?: string;
  telegram_username?: string;
}

// ==================== EVENT TYPES ====================

export type EventStatus = 'draft' | 'review' | 'active' | 'ended' | 'cancelled';

// Legacy prize details (from prize_details JSONB)
export interface PrizeDetails {
  type: string;
  token_address?: string;
  prize_pool?: string;
  distribution_type?: 'equal' | 'position_based';
  position_rewards?: Array<{ position: number; amount: string }>;
  chain?: string;
  token_metadata?: {
    symbol: string;
    name: string;
    decimals: number;
  };
  nfts?: Array<{ contract_address: string; token_id: string }>;
  nft_distribution_type?: 'random' | 'fcfs' | 'position_based';
  mintable_nfts?: { contract_address: string; base_uri: string };
  voucher_description?: string;
  voucher_codes?: string[];
  gift_description?: string;
  gift_value?: string;
}

// New reward_types structure (from reward_types JSONB array)
export interface RewardType {
  type: 'tokens' | 'nft' | 'mintable_nft' | 'voucher' | 'gift';
  // Token rewards
  token_address?: string;
  prize_pool?: string;
  distribution_type?: 'equal' | 'position_based';
  position_rewards?: Array<{ position: number; amount: string }>;
  chain?: string;
  token_metadata?: {
    symbol: string;
    name: string;
    decimals: number;
  };
  // NFT rewards
  nfts?: Array<{ contract_address: string; token_id: string }>;
  nft_distribution_type?: 'random' | 'fcfs' | 'position_based';
  nft_position_distribution?: Array<{ position: number; nft_index: number }>;
  // Mintable NFT
  mintable_nfts?: { contract_address: string; base_uri: string };
  mintable_nft_distribution_type?: string;
  mintable_nft_position_distribution?: Array<{ position: number; metadata_uri: string }>;
  // Voucher/Gift
  voucher_description?: string;
  voucher_codes?: string[];
  gift_description?: string;
  gift_value?: string;
}

// Point system configuration
export interface PointSystem {
  enabled: boolean;
  point_name: string;
  leaderboard_enabled: boolean;
}

// Roles and permissions
export interface RolesPermissions {
  roles: Array<{ name: string; permissions: string[] }>;
  assignments: Array<{ user_id: string; role: string }>;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  video_url?: string;
  status: EventStatus;
  created_by: string;
  start_time: string;
  end_time: string;
  banner_path?: string;
  banner_url?: string;
  logo_path?: string;
  logo_url?: string;
  num_winners?: number;
  // Legacy field (still in DB but not used for new events)
  prize_details?: PrizeDetails;
  // New fields from migrations
  reward_types?: RewardType[];
  setup_progress?: SetupProgress;
  point_system?: PointSystem;
  roles_permissions?: RolesPermissions;
  // Relations
  tasks: Task[];
  created_at: string;
  updated_at: string;
}

export interface SetupProgress {
  tasks: number;
  rewards: number;
  roles?: number;
}

// Event participation
export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  joined_at: string;
  referrer_id?: string;
}

// Event referrals
export interface EventReferral {
  id: string;
  event_id: string;
  referrer_id: string;
  referred_user_id: string;
  created_at: string;
}

export interface EventFilters {
  status?: EventStatus;
  created_by?: string;
  limit?: number;
  offset?: number;
}

// ==================== TASK TYPES ====================

export type TaskType = 
  | 'twitter' 
  | 'social'
  | 'discord' 
  | 'telegram' 
  | 'quiz' 
  | 'puzzle'
  | 'content_submission'
  | 'referral'
  | 'scoreline_prediction'
  | 'code_entry';

export type TaskCategory = 
  | 'Social' 
  | 'Quiz & Games' 
  | 'Predictions' 
  | 'Content' 
  | 'Challenges' 
  | 'Referral';

export interface Task {
  id: string;
  type: TaskType;
  title?: string;
  description?: string;
  config: TaskConfig;
  points?: number;
  required?: boolean;
  order?: number;
}

export interface TaskConfig {
  // Twitter/Social
  twitter?: {
    followAccount?: boolean;
    likePost?: boolean;
    retweetPost?: boolean;
    commentPost?: boolean;
    quotePost?: boolean;
    profileLink?: string;
    postLink?: string;
  };
  
  // Discord
  discord?: {
    joinServer?: boolean;
    inviteLink?: string;
    serverId?: string;
  };
  
  // Telegram
  telegram?: {
    joinChannel?: boolean;
    joinGroup?: boolean;
    reactPinned?: boolean;
    shareUsername?: boolean;
    channelLink?: string;
    groupLink?: string;
  };
  
  // Quiz
  questions?: QuizQuestion[];
  quiz?: {
    questions?: QuizQuestion[];
  };
  
  // Puzzle
  puzzle?: {
    question?: string;
    answer?: string;
    hint?: string;
  };
  
  // Content Submission
  contentType?: string;
  submissionType?: 'link' | 'text' | 'file';
  
  // Scoreline Prediction
  home_team?: {
    name: string;
    logo?: string;
  };
  away_team?: {
    name: string;
    logo?: string;
  };
  match_date?: string;
  league?: string;
  
  // Code Entry
  validCodes?: string[];
  
  // Generic
  description?: string;
  instructions?: string;
}

export interface QuizQuestion {
  question: string;
  type: 'multiple_choice' | 'short_answer';
  options?: string[];
  correctAnswer: string;
}

export interface TaskSubmission {
  id: string;
  task_id: string;
  user_id: string;
  event_id: string;
  submission: Record<string, unknown>;
  verified: boolean;
  referrer_id?: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== REWARD TYPES ====================

export type RewardType = 
  | 'Token' 
  | 'ETH' 
  | 'NFT' 
  | 'MintableNFT' 
  | 'Gift' 
  | 'Voucher' 
  | 'CustomPoints';

export type DistributionType = 'even' | 'custom' | 'random';

export interface Reward {
  id: string;
  type: RewardType;
  chain?: string;
  tokenAddress?: string;
  prizePool?: string;
  distributionType?: DistributionType;
  positionRewards?: PositionReward[];
  customTokenSymbol?: string;
  customTokenAddress?: string;
  customTokenDecimals?: string;
  nfts?: NftReward[];
  nftDistributionType?: DistributionType;
  nftPositionDistribution?: NftDistributionPosition[];
  mintableNfts?: MintableNft[];
  mintableNftDistributionType?: DistributionType;
  mintableNftPositionDistribution?: NftDistributionPosition[];
  giftDescription?: string;
  giftValue?: string;
  voucherDescription?: string;
  voucherCodes?: string[];
  customPointName?: string;
  leaderboardEnabled?: boolean;
}

export interface PositionReward {
  position: number;
  amount: string;
}

export interface NftReward {
  id: string;
  contract: string;
  tokenId: string;
}

export interface MintableNft {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  supply: string;
  rarity: string;
  rarityPercentage: string;
}

export interface NftDistributionPosition {
  position: number;
  nftId: string;
}

// ==================== REFERRAL TYPES ====================

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  joined_at: string;
  referrer_id?: string | null;
}

export interface EventReferral {
  id: string;
  event_id: string;
  referrer_id: string;
  referred_user_id: string;
  created_at: string;
}

// ==================== API TYPES ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorData;
  message?: string;
}

export interface ApiErrorData {
  code: string;
  message: string;
  details?: unknown;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ==================== SOCIAL CONNECTION TYPES ====================

export interface SocialConnection {
  id: string;
  user_id: string;
  platform: 'twitter' | 'discord' | 'telegram';
  platform_user_id: string;
  platform_username: string;
  access_token?: string;
  refresh_token?: string;
  created_at: string;
  updated_at: string;
}

// ==================== DTO TYPES (Data Transfer Objects) ====================

export interface CreateEventDto {
  title: string;
  description: string;
  event_type: EventType;
  start_time: string;
  end_time: string;
  banner_url?: string;
  logo_url?: string;
  num_winners?: number;
  tasks?: Task[];
  rewards?: Reward[];
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  banner_url?: string;
  logo_url?: string;
  status?: EventStatus;
  tasks?: Task[];
  rewards?: Reward[];
  setup_progress?: SetupProgress;
}

export interface CreateTaskDto {
  type: TaskType;
  title?: string;
  description?: string;
  config: TaskConfig;
  points?: number;
  required?: boolean;
}

export interface SubmitTaskDto {
  task_id: string;
  submission: Record<string, unknown>;
  referrer_id?: string;
}
