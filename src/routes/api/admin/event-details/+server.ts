import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  // Check if user is admin or moderator
  const { data: roleData } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', locals.user.id)
    .in('role', ['admin', 'moderator'])
    .single();

  if (!roleData) {
    throw error(403, 'Forbidden: Admin or moderator access required');
  }

  const eventId = url.searchParams.get('event_id');

  if (!eventId) {
    throw error(400, 'Missing event_id parameter');
  }

  // Fetch full event details including creator info
  const { data: eventData, error: eventError } = await supabaseAdmin
    .from('events')
    .select(`
      *,
      users!events_created_by_fkey(
        id,
        username,
        wallet_address
      )
    `)
    .eq('id', eventId)
    .single();

  if (eventError || !eventData) {
    throw error(404, 'Event not found');
  }

  // Format response for admin review
  const response = {
    id: eventData.id,
    title: eventData.title,
    description: eventData.description,
    event_type: eventData.event_type,
    start_time: eventData.start_time,
    end_time: eventData.end_time,
    num_winners: eventData.num_winners,
    status: eventData.status,
    creator_username: eventData.users?.username,
    creator_wallet: eventData.users?.wallet_address,
    reward_types: eventData.reward_types || [],
    prize_details: eventData.prize_details,
    tasks: eventData.tasks || [],
    video_url: eventData.video_url,
    logo_url: eventData.logo_url,
    banner_url: eventData.banner_url,
    created_at: eventData.created_at
  };

  return json(response);
};
