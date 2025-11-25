import type { RequestHandler } from '@sveltejs/kit';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  DEFAULT_COOKIE_OPTIONS
} from '$lib/server/authCookies';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
  const { access_token, refresh_token, expires_in } = await request.json();

  if (!access_token) {
    return new Response('Missing access token', { status: 400 });
  }

  const cookieOptions = {
    ...DEFAULT_COOKIE_OPTIONS,
    secure: url.protocol === 'https:'
  } as const;

  cookies.set(ACCESS_TOKEN_COOKIE, access_token, {
    ...cookieOptions,
    maxAge: expires_in ?? 60 * 60
  });

  if (refresh_token) {
    cookies.set(REFRESH_TOKEN_COOKIE, refresh_token, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 30
    });
  }

  return new Response(null, { status: 204 });
};
