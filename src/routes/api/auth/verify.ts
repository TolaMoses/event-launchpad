import { json } from '@sveltejs/kit';
import { verifyMessage } from 'ethers';
import jwt from 'jsonwebtoken';
import { supabase } from '$lib/supabaseClient';
import 'dotenv/config';

export async function POST({ request, cookies }) {
  const { message, signature } = await request.json();

  // Recover wallet address
  const walletAddress = verifyMessage(message, signature).toLowerCase();
  if (!walletAddress) {
    return new Response('Invalid signature', { status: 401 });
  }

  // Upsert user in Supabase
  const { error } = await supabase
    .from('users')
    .upsert({ wallet_address: walletAddress }, { onConflict: 'wallet_address' });

  if (error) return new Response('Database error', { status: 500 });

  // Create JWT for Supabase Auth
  const token = jwt.sign(
    { sub: walletAddress },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Set secure cookie
  cookies.set('sb-access-token', token, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24
  });

  return json({ walletAddress });
}
