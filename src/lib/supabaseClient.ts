//src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';

export const supabase = createClient(
  publicEnv.PUBLIC_SUPABASE_URL,
  publicEnv.PUBLIC_SUPABASE_ANON_KEY
);
