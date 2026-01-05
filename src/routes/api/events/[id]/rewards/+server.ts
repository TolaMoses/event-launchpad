import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

/**
 * Add or update rewards for a community event
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const eventId = params.id;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (err) {
    throw error(400, 'Invalid JSON payload');
  }

  const rewards = Array.isArray(body.rewards) ? body.rewards : [];

  if (rewards.length === 0) {
    throw error(400, 'At least one reward is required');
  }

  // Fetch the event to verify ownership
  const { data: event, error: fetchError } = await supabaseAdmin
    .from('events')
    .select('id, event_type, created_by, status, setup_progress')
    .eq('id', eventId)
    .single();

  if (fetchError || !event) {
    throw error(404, 'Event not found');
  }

  // Verify user is the creator
  if (event.created_by !== locals.user.id) {
    throw error(403, 'Only the event creator can add rewards');
  }

  // Only community events in draft status can add rewards this way
  if (event.event_type !== 'community') {
    throw error(400, 'Only community events can add rewards after creation');
  }

  if (event.status !== 'draft') {
    throw error(400, 'Rewards can only be added to draft events');
  }

  // Update rewards and setup progress
  const setupProgress = {
    tasks: event.setup_progress?.tasks || 0,
    rewards: 100
  };

  const { error: updateError } = await supabaseAdmin
    .from('events')
    .update({
      reward_types: rewards,
      prize_details: rewards[0], // Legacy single reward for backwards compatibility
      setup_progress: setupProgress
    })
    .eq('id', eventId);

  if (updateError) {
    console.error('Failed to update rewards:', updateError);
    throw error(500, 'Failed to add rewards');
  }

  return json({ 
    success: true, 
    message: 'Rewards added successfully',
    setupProgress
  });
};
