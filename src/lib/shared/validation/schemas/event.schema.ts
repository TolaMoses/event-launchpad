/**
 * Event Validation Schemas
 * 
 * Zod schemas for validating event-related requests
 * Updated to match frontend data format
 */

import { z } from 'zod';

// Event status enum
export const eventStatusSchema = z.enum(['draft', 'review', 'active', 'ended', 'cancelled']);

// Asset schema - allow both path formats
const assetSchema = z.object({
  path: z.string().min(1),
  publicUrl: z.string()
}).nullable().optional();

// Task config schema (flexible - accepts any config structure)
const taskConfigSchema = z.record(z.any());

// Task schema - match frontend TaskTypeKey values
const taskSchema = z.object({
  id: z.string().optional(),
  type: z.string(), // Accept any string - frontend uses 'social', 'content', 'quiz', etc.
  config: taskConfigSchema,
  points: z.number().int().min(0).optional(),
  required: z.boolean().optional()
});

// Reward schema - flexible to accept frontend format
const rewardSchema = z.object({
  id: z.string().optional(),
  type: z.string(), // Accept any type string from frontend
  // All fields optional and flexible
  chain: z.string().optional(),
  tokenAddress: z.string().optional(),
  customTokenAddress: z.string().optional(),
  customTokenSymbol: z.string().optional(),
  customTokenDecimals: z.string().optional(),
  prizePool: z.string().optional(),
  distributionType: z.string().optional(),
  positionRewards: z.array(z.any()).optional(),
  nfts: z.array(z.any()).optional(),
  nftDistributionType: z.string().optional(),
  nftPositionDistribution: z.array(z.any()).optional(),
  mintableNfts: z.array(z.any()).optional(),
  mintableNftDistributionType: z.string().optional(),
  mintableNftPositionDistribution: z.array(z.any()).optional(),
  giftDescription: z.string().optional(),
  giftValue: z.string().optional(),
  voucherDescription: z.string().optional(),
  voucherCodes: z.array(z.string()).optional(),
  customPointName: z.string().optional(),
  leaderboardEnabled: z.boolean().optional()
}).passthrough(); // Allow additional fields

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

  video_url: z.string().url().nullable().optional(),

  start_time: z.string(),

  end_time: z.string(),

  num_winners: z.number()
    .int()
    .positive()
    .optional()
    .nullable(),

  assets: z.object({
    logo: assetSchema,
    banner: assetSchema
  }).optional(),

  tasks: z.array(taskSchema)
    .min(1, 'At least one task required'),

  reward_types: z.array(rewardSchema)
    .min(1, 'At least one reward required'),

  // Optional fields
  point_system: z.object({
    enabled: z.boolean(),
    point_name: z.string(),
    leaderboard_enabled: z.boolean()
  }).optional(),

  roles_permissions: z.any().optional()
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
