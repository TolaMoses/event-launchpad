/**
 * Wallet Nonce Generation API
 * 
 * Updated with simplified architecture:
 * - Redis-based nonce storage
 * - 5-minute TTL (auto-expires)
 * - Validation
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { nonceStore } from '$lib/infrastructure/redis/nonces';
import { validateBody } from '$lib/server/middleware/validation';
import { walletConnectionSchema } from '$lib/shared/validation/schemas/user.schema';
import { randomBytes } from 'crypto';

export const POST: RequestHandler = async ({ request }) => {
  // 1. Validate wallet address
  const { walletAddress } = await validateBody(request, walletConnectionSchema);

  // 2. Generate cryptographically secure nonce
  const nonce = randomBytes(32).toString('hex');
  const message = `Sign this message to authenticate with your wallet:\n\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;

  // 3. Store in Redis (5 minute TTL, auto-expires)
  await nonceStore.create(walletAddress, nonce, message);

  return json({ message });
};
