import type { RequestHandler } from '@sveltejs/kit';
import { createNonceMessage } from '$lib/server/nonceStore';

export const POST: RequestHandler = async ({ request }) => {
  const { address } = await request.json();

  if (!address || typeof address !== 'string') {
    return new Response('Missing wallet address', { status: 400 });
  }

  const entry = createNonceMessage(address);

  return new Response(
    JSON.stringify({
      message: entry.message,
      nonce: entry.nonce,
      expiresAt: entry.expiresAt
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
};
