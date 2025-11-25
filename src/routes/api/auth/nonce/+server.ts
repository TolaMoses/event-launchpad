import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  const nonce = Math.floor(Math.random() * 1e6).toString();
  return new Response(JSON.stringify({ nonce }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
