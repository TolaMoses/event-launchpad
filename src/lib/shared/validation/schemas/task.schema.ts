/**
 * Task Validation Schemas
 * 
 * Zod schemas for validating task-related requests
 */

import { z } from 'zod';

/**
 * Task submission schema
 */
export const taskSubmissionSchema = z.object({
  task_id: z.string().uuid(),
  event_id: z.string().uuid(),
  submission: z.record(z.any()),
  referrer_id: z.string().uuid().optional().nullable()
});

/**
 * Twitter verification schema
 */
export const twitterVerificationSchema = z.object({
  taskId: z.string().uuid(),
  eventId: z.string().uuid(),
  action: z.enum(['follow', 'like', 'retweet', 'quote']),
  targetUsername: z.string().optional(),
  tweetUrl: z.string().url().optional()
}).refine(data => {
  if (data.action === 'follow') {
    return !!data.targetUsername;
  }
  if (['like', 'retweet', 'quote'].includes(data.action)) {
    return !!data.tweetUrl;
  }
  return true;
}, {
  message: 'Missing required fields for action type'
});

/**
 * Discord verification schema
 */
export const discordVerificationSchema = z.object({
  taskId: z.string().uuid(),
  eventId: z.string().uuid(),
  action: z.enum(['join_server', 'have_role']),
  serverId: z.string(),
  roleId: z.string().optional()
});

/**
 * Telegram verification schema
 */
export const telegramVerificationSchema = z.object({
  taskId: z.string().uuid(),
  eventId: z.string().uuid(),
  action: z.enum(['join_channel', 'join_group']),
  channelId: z.string().optional(),
  channelName: z.string().optional()
});

/**
 * Quiz submission schema
 */
export const quizSubmissionSchema = z.object({
  taskId: z.string().uuid(),
  eventId: z.string().uuid(),
  answer: z.string().min(1)
});

/**
 * Code entry schema
 */
export const codeEntrySchema = z.object({
  taskId: z.string().uuid(),
  eventId: z.string().uuid(),
  code: z.string().min(1).max(100)
});

/**
 * Prediction submission schema
 */
export const predictionSchema = z.object({
  taskId: z.string().uuid(),
  eventId: z.string().uuid(),
  prediction: z.object({
    home_score: z.number().int().min(0).max(99),
    away_score: z.number().int().min(0).max(99)
  }),
  referrerId: z.string().uuid().optional().nullable()
});

/**
 * Content submission schema
 */
export const contentSubmissionSchema = z.object({
  taskId: z.string().uuid(),
  eventId: z.string().uuid(),
  content: z.object({
    url: z.string().url().optional(),
    text: z.string().max(5000).optional(),
    file_url: z.string().url().optional()
  }).refine(data => 
    data.url || data.text || data.file_url,
    'At least one content field must be provided'
  )
});
