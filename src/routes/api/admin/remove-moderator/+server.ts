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

  const { role_id } = await request.json();

  if (!role_id) {
    throw error(400, 'Missing role_id');
  }

  // Prevent removing the last admin
  const { data: roleToRemove } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('id', role_id)
    .single();

  if (roleToRemove?.role === 'admin') {
    const { count } = await supabaseAdmin
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (count && count <= 1) {
      throw error(400, 'Cannot remove the last admin');
    }
  }

  // Delete the role
  const { error: deleteError } = await supabaseAdmin
    .from('user_roles')
    .delete()
    .eq('id', role_id);

  if (deleteError) {
    console.error('Failed to remove moderator:', deleteError);
    throw error(500, 'Failed to remove moderator');
  }

  return json({ success: true });
};
