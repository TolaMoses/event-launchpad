/**
 * Wallet Verification API
 * 
 * Updated with simplified architecture:
 * - Redis NonceStore (atomic consume)
 * - Rate limiting (prevent brute force)
 * - Better error handling
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { ethers } from 'ethers';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { nonceStore } from '$lib/infrastructure/redis/nonces';
import { rateLimiter, RATE_LIMITS } from '$lib/infrastructure/redis/rateLimiter';
import { validateBody } from '$lib/server/middleware/validation';
import { walletSignatureSchema } from '$lib/shared/validation/schemas/user.schema';

const ACCESS_TOKEN_COOKIE = 'sb-access-token';
const REFRESH_TOKEN_COOKIE = 'sb-refresh-token';
const COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const
};

export const POST: RequestHandler = async ({ request, cookies, url }) => {
  try {
    // 1. Validate input
    const validated = await validateBody(request, walletSignatureSchema);
    const normalizedAddress = validated.walletAddress.toLowerCase();

    // 2. Rate limiting (prevent brute force attacks)
    await rateLimiter.check(
      `wallet-auth:${normalizedAddress}`,
      RATE_LIMITS.auth
    );

    // 3. Get and consume nonce (atomic operation, one-time use)
    const nonceEntry = await nonceStore.consume(normalizedAddress);

    if (!nonceEntry) {
      return json(
        { error: 'Nonce expired or not found. Please request a new nonce.' },
        { status: 401 }
      );
    }

    // 4. Verify signature
    let recovered: string;
    try {
      recovered = ethers.verifyMessage(nonceEntry.message, validated.signature).toLowerCase();
    } catch (error) {
      console.error('Signature verification failed:', error);
      return json(
        { error: 'Invalid signature format' },
        { status: 401 }
      );
    }

    if (recovered !== normalizedAddress) {
      return json(
        { error: 'Signature does not match wallet address' },
        { status: 401 }
      );
    }

    // 5. Create session via Supabase Edge Function
    const edgeUrl =
      privateEnv.SUPABASE_WALLET_LOGIN_FUNCTION_URL ??
      `${publicEnv.PUBLIC_SUPABASE_URL ?? ''}/functions/v1/wallet-login`;

    const supabaseAnonKey = publicEnv.PUBLIC_SUPABASE_ANON_KEY;

    if (!edgeUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration for wallet login');
      return json(
        { error: 'Authentication configuration error' },
        { status: 500 }
      );
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
        signature: validated.signature
      })
    });

    if (!edgeResponse.ok) {
      const errorText = await edgeResponse.text();
      console.error('Edge function wallet-login failed:', edgeResponse.status, errorText);
      return json(
        { error: 'Failed to create session' },
        { status: edgeResponse.status }
      );
    }

    const { session, user } = await edgeResponse.json();

    if (!session || !session.access_token) {
      console.error('Edge function response missing session');
      return json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // 6. Set session cookies
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

    return json({
      success: true,
      walletAddress: normalizedAddress,
      userId: user?.id ?? null
    });
  } catch (error: any) {
    console.error('Wallet verification failed:', error);
    
    // Return appropriate error for validation failures
    if (error?.status === 422) {
      return json(
        { error: 'Invalid request data' },
        { status: 422 }
      );
    }
    
    return json(
      { error: 'Authentication failed. Please try again.' },
      { status: 500 }
    );
  }
};
