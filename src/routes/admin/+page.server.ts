import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export const load: PageServerLoad = async ({ locals }) => {
  // Check if user is logged in
  if (!locals.user) {
    throw redirect(302, '/');
  }

  // Check if user has admin or moderator role
  const { data: roleData } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', locals.user.id)
    .in('role', ['admin', 'moderator'])
    .maybeSingle();

  if (!roleData) {
    throw error(403, 'Access denied. Admin or moderator privileges required.');
  }

  // Load pending events
  const { data: pendingEvents } = await supabaseAdmin
    .from('events')
    .select('*, users!events_created_by_fkey(wallet_address, username)')
    .eq('status', 'review')
    .order('created_at', { ascending: false });

  // Load moderators (only if admin)
  let moderators = [];
  if (roleData.role === 'admin') {
    const { data: modData } = await supabaseAdmin
      .from('user_roles')
      .select('*, users!user_roles_user_id_fkey(wallet_address, username)')
      .in('role', ['admin', 'moderator'])
      .order('granted_at', { ascending: false });
    
    moderators = modData || [];
  }

  return {
    user: locals.user,
    userRole: roleData.role,
    pendingEvents: pendingEvents || [],
    moderators
  };
};
