import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

export const admin = createClient(
  env.SUPABASE_URL!,
  env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
  { auth: { persistSession: false } }
);


