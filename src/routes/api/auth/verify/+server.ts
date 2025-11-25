import type { RequestHandler } from '@sveltejs/kit';
import { ethers } from 'ethers';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { consumeNonce } from '$lib/server/nonceStore';

const ACCESS_TOKEN_COOKIE = 'sb-access-token';
const REFRESH_TOKEN_COOKIE = 'sb-refresh-token';
const COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const
};

const WALLET_EMAIL_DOMAIN = 'wallet.phaeton';

function buildEmail(address: string) {
  return `${address}@${WALLET_EMAIL_DOMAIN}`;
}

function buildPassword(address: string) {
  return `wallet:${address}`;
}

export const POST: RequestHandler = async ({ request, cookies, url }) => {
  try {
    const { address, signature } = await request.json();

    if (!address || typeof address !== 'string' || !signature || typeof signature !== 'string') {
      return new Response('Invalid payload', { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const nonceEntry = consumeNonce(normalizedAddress);

    if (!nonceEntry) {
      return new Response('Nonce expired or not found', { status: 401 });
    }

    let recovered: string;
    try {
      recovered = ethers.verifyMessage(nonceEntry.message, signature).toLowerCase();
    } catch (error) {
      console.error('Signature verification failed', error);
      return new Response('Invalid signature', { status: 401 });
    }

    if (recovered !== normalizedAddress) {
      return new Response('Signature address mismatch', { status: 401 });
    }

    const edgeUrl =
      privateEnv.SUPABASE_WALLET_LOGIN_FUNCTION_URL ??
      `${publicEnv.PUBLIC_SUPABASE_URL ?? ''}/functions/v1/wallet-login`;

    const supabaseAnonKey = publicEnv.PUBLIC_SUPABASE_ANON_KEY;

    if (!edgeUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration for wallet login');
      return new Response('Auth configuration error', { status: 500 });
    }

    const edgeResponse = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        address: normalizedAddress,
        message: nonceEntry.message,
        signature
      })
    });

    if (!edgeResponse.ok) {
      const errorText = await edgeResponse.text();
      console.error('Edge function wallet-login failed', edgeResponse.status, errorText);
      return new Response('Auth error', { status: edgeResponse.status });
    }

    const { session, user } = await edgeResponse.json();

    if (!session || !session.access_token) {
      console.error('Edge function response missing session');
      return new Response('Auth error', { status: 500 });
    }

    cookies.set(ACCESS_TOKEN_COOKIE, session.access_token, {
      ...COOKIE_OPTIONS,
      secure: url.protocol === 'https:',
      maxAge: session.expires_in ?? 60 * 60
    });

    if (session.refresh_token) {
      cookies.set(REFRESH_TOKEN_COOKIE, session.refresh_token, {
        ...COOKIE_OPTIONS,
        secure: url.protocol === 'https:',
        maxAge: 60 * 60 * 24 * 30
      });
    }

    return new Response(
      JSON.stringify({
        walletAddress: normalizedAddress,
        userId: user?.id ?? null
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Wallet verification failed', error);
    return new Response('Auth error', { status: 500 });
  }
};
