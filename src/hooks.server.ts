import type { Handle, RequestEvent } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  DEFAULT_COOKIE_OPTIONS
} from '$lib/server/authCookies';

function clearAuthCookies(event: RequestEvent) {
  const options = { ...DEFAULT_COOKIE_OPTIONS, secure: event.url.protocol === 'https:' };
  event.cookies.delete(ACCESS_TOKEN_COOKIE, options);
  event.cookies.delete(REFRESH_TOKEN_COOKIE, options);
}

export const handle: Handle = async ({ event, resolve }) => {
  const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false
    }
  });

  const accessToken = event.cookies.get(ACCESS_TOKEN_COOKIE);
  const refreshToken = event.cookies.get(REFRESH_TOKEN_COOKIE);

  event.locals.supabase = supabase;
  event.locals.user = null;

  if (accessToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken ?? ''
    });

    if (error) {
      clearAuthCookies(event);
    } else if (data.session) {
      event.locals.user = data.session.user ?? null;
      const newAccessToken = data.session.access_token;
      const newRefreshToken = data.session.refresh_token;

      if (newAccessToken && newAccessToken !== accessToken) {
        event.cookies.set(ACCESS_TOKEN_COOKIE, newAccessToken, {
          ...DEFAULT_COOKIE_OPTIONS,
          secure: event.url.protocol === 'https:',
          maxAge: data.session.expires_in ?? 60 * 60
        });
      }

      if (newRefreshToken && newRefreshToken !== refreshToken) {
        event.cookies.set(REFRESH_TOKEN_COOKIE, newRefreshToken, {
          ...DEFAULT_COOKIE_OPTIONS,
          secure: event.url.protocol === 'https:',
          maxAge: 60 * 60 * 24 * 30
        });
      }
    }
  }

  const response = await resolve(event);

  return response;
};
