import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  // Check if user is admin
  const { data: roleData } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', locals.user.id)
    .eq('role', 'admin')
    .single();

  if (!roleData) {
    throw error(403, 'Forbidden: Admin access required');
  }

  const { identifier } = await request.json();

  if (!identifier || typeof identifier !== 'string') {
    throw error(400, 'Missing or invalid identifier');
  }

  // Find user by wallet address or username
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, wallet_address, username')
    .or(`wallet_address.ilike.%${identifier}%,username.ilike.%${identifier}%`)
    .maybeSingle();

  if (userError || !userData) {
    throw error(404, 'User not found');
  }

  // Insert moderator role
  const { data: newRole, error: insertError } = await supabaseAdmin
    .from('user_roles')
    .insert({
      user_id: userData.id,
      role: 'moderator',
      granted_by: locals.user.id
    })
    .select('*, users!user_roles_user_id_fkey(wallet_address, username)')
    .single();

  if (insertError) {
    if (insertError.code === '23505') { // Unique constraint violation
      throw error(409, 'User is already a moderator');
    }
    console.error('Failed to add moderator:', insertError);
    throw error(500, 'Failed to add moderator');
  }

  return json({ moderator: newRole });
};
