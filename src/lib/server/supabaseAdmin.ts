import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

const url = publicEnv.PUBLIC_SUPABASE_URL;
const serviceRoleKey = privateEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  throw new Error('Supabase admin client missing PUBLIC_SUPABASE_URL');
}

if (!serviceRoleKey) {
  throw new Error('Supabase admin client missing SUPABASE_SERVICE_ROLE_KEY');
}

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
