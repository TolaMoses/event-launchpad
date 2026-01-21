/**
 * Event Validation Schemas
 * 
 * Zod schemas for validating event-related requests
 */

import { z } from 'zod';

// Event status enum
export const eventStatusSchema = z.enum(['draft', 'review', 'active', 'ended', 'cancelled']);

// Asset schema
const assetSchema = z.object({
  path: z.string().min(1),
  publicUrl: z.string().url()
});

// Task config schema (basic, will vary by task type)
const taskConfigSchema = z.record(z.any());

// Task schema
const taskSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum([
    'twitter',
    'discord',
    'telegram',
    'quiz',
    'puzzle',
    'referral',
    'content_submission',
    'scoreline_prediction',
    'code_entry'
  ]),
  config: taskConfigSchema,
  points: z.number().int().min(0).optional(),
  required: z.boolean().optional()
});

// Reward schema (matches reward_types JSONB structure)
const rewardSchema = z.object({
  type: z.enum(['tokens', 'nft', 'mintable_nft', 'voucher', 'gift']),
  // Token rewards
  token_address: z.string().optional(),
  prize_pool: z.string().optional(),
  distribution_type: z.enum(['equal', 'position_based']).optional(),
  position_rewards: z.array(z.object({
    position: z.number(),
    amount: z.string()
  })).optional(),
  chain: z.string().optional(),
  token_metadata: z.object({
    symbol: z.string(),
    name: z.string(),
    decimals: z.number()
  }).optional(),
  // NFT rewards
  nfts: z.array(z.object({
    contract_address: z.string(),
    token_id: z.string()
  })).optional(),
  nft_distribution_type: z.enum(['random', 'fcfs', 'position_based']).optional(),
  // Mintable NFT
  mintable_nfts: z.object({
    contract_address: z.string(),
    base_uri: z.string()
  }).optional(),
  // Voucher/Gift
  voucher_description: z.string().optional(),
  voucher_codes: z.array(z.string()).optional(),
  gift_description: z.string().optional(),
  gift_value: z.string().optional()
});

/**
 * Base event schema (without validation refinements)
 */
const baseEventSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters')
    .trim(),
  
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description too long')
    .trim(),
  
  video_url: z.string().url().optional(),
  
  start_time: z.string()
    .datetime('Invalid start time format'),
  
  end_time: z.string()
    .datetime('Invalid end time format'),
  
  num_winners: z.number()
    .int()
    .positive()
    .optional()
    .nullable(),
  
  assets: z.object({
    logo: assetSchema,
    banner: assetSchema.optional()
  }).optional(),
  
  tasks: z.array(taskSchema)
    .min(1, 'At least one task required'),
  
  reward_types: z.array(rewardSchema)
    .min(1, 'At least one reward required'),
  
  // Optional fields from migrations
  point_system: z.object({
    enabled: z.boolean(),
    point_name: z.string(),
    leaderboard_enabled: z.boolean()
  }).optional(),
  
  roles_permissions: z.object({
    roles: z.array(z.object({
      name: z.string(),
      permissions: z.array(z.string())
    })),
    assignments: z.array(z.object({
      user_id: z.string().uuid(),
      role: z.string()
    }))
  }).optional()
});

/**
 * Schema for creating a new event (with time validation)
 */
export const eventCreateSchema = baseEventSchema.refine(data => {
  const start = new Date(data.start_time);
  const end = new Date(data.end_time);
  return end > start;
}, {
  message: 'End time must be after start time',
  path: ['end_time']
});

/**
 * Schema for updating an event
 */
export const eventUpdateSchema = baseEventSchema.partial();

/**
 * Schema for event filters/queries
 */
export const eventFilterSchema = z.object({
  status: eventStatusSchema.optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
  created_by: z.string().uuid().optional()
});

/**
 * Schema for event participation
 */
export const eventParticipationSchema = z.object({
  event_id: z.string().uuid(),
  referrer_id: z.string().uuid().optional().nullable()
});
