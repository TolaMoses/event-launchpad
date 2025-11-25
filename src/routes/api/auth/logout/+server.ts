import type { RequestHandler } from '@sveltejs/kit';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  DEFAULT_COOKIE_OPTIONS
} from '$lib/server/authCookies';

export const POST: RequestHandler = async ({ cookies, locals, url }) => {
  if (locals.supabase) {
    await locals.supabase.auth.signOut();
  }

  const options = { ...DEFAULT_COOKIE_OPTIONS, secure: url.protocol === 'https:' };

  cookies.delete(ACCESS_TOKEN_COOKIE, options);
  cookies.delete(REFRESH_TOKEN_COOKIE, options);

  return new Response('OK');
};
