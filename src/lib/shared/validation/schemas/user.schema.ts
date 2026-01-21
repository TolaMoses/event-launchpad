/**
 * User Validation Schemas
 * 
 * Zod schemas for validating user-related requests
 */

import { z } from 'zod';

/**
 * Wallet address validation
 */
export const walletAddressSchema = z.string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

/**
 * Username validation
 */
export const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be less than 30 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain letters, numbers, underscores, and dashes'
  );

/**
 * Email validation (optional for wallet users)
 */
export const emailSchema = z.string()
  .email('Invalid email address')
  .optional();

/**
 * Profile update schema
 */
export const profileUpdateSchema = z.object({
  username: usernameSchema.optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
  twitter_username: z.string().max(50).optional(),
  discord_username: z.string().max(50).optional(),
  telegram_username: z.string().max(50).optional()
});

/**
 * Wallet connection request schema
 */
export const walletConnectionSchema = z.object({
  walletAddress: walletAddressSchema
});

/**
 * Wallet signature verification schema
 */
export const walletSignatureSchema = z.object({
  walletAddress: walletAddressSchema,
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid signature format')
});

/**
 * Social connection schema
 */
export const socialConnectionSchema = z.object({
  platform: z.enum(['twitter', 'discord', 'telegram']),
  platform_user_id: z.string(),
  platform_username: z.string(),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  token_expiry: z.string().datetime().optional()
});
