import type { RequestHandler } from '@sveltejs/kit';
import { nonceStore } from '$lib/infrastructure/redis/nonces';
import { randomBytes } from 'crypto';

export const POST: RequestHandler = async ({ request }) => {
  const { address } = await request.json();

  if (!address || typeof address !== 'string') {
    return new Response('Missing wallet address', { status: 400 });
  }

  // Generate cryptographically secure nonce
  const nonce = randomBytes(32).toString('hex');
  const message = `Sign this message to authenticate with your wallet:\n\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  // Store in Redis
  await nonceStore.create(address, nonce, message);

  return new Response(
    JSON.stringify({
      message,
      nonce,
      expiresAt
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
};
