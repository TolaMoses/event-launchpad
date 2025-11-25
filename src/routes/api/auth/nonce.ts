import { json } from '@sveltejs/kit';
import { randomBytes } from 'crypto';

export async function GET() {
  const nonce = randomBytes(16).toString('hex');
  return json({ nonce });
}
