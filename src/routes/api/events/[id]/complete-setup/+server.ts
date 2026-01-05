import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

/**
 * Complete community event setup and submit for review
 * This endpoint changes the status from 'draft' to 'review'
 */
export const POST: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const eventId = params.id;

  // Fetch the event to verify ownership and type
  const { data: event, error: fetchError } = await supabaseAdmin
    .from('events')
    .select('id, event_type, created_by, status, setup_progress, tasks, reward_types')
    .eq('id', eventId)
    .single();

  if (fetchError || !event) {
    throw error(404, 'Event not found');
  }

  // Verify user is the creator
  if (event.created_by !== locals.user.id) {
    throw error(403, 'Only the event creator can complete setup');
  }

  // Only community events can use this endpoint
  if (event.event_type !== 'community') {
    throw error(400, 'Only community events need setup completion');
  }

  // Verify event is in draft status
  if (event.status !== 'draft') {
    throw error(400, `Event is already ${event.status}. Only draft events can be submitted for review.`);
  }

  // Verify setup is complete (tasks and rewards added)
  const hasTasks = Array.isArray(event.tasks) && event.tasks.length > 0;
  const hasRewards = Array.isArray(event.reward_types) && event.reward_types.length > 0;

  if (!hasTasks || !hasRewards) {
    throw error(400, 'Event must have at least one task and one reward before submission');
  }

  // Update event status to 'review'
  const { error: updateError } = await supabaseAdmin
    .from('events')
    .update({
      status: 'review',
      setup_progress: { tasks: 100, rewards: 100 }
    })
    .eq('id', eventId);

  if (updateError) {
    console.error('Failed to update event status:', updateError);
    throw error(500, 'Failed to submit event for review');
  }

  return json({ 
    success: true, 
    message: 'Event submitted for review successfully',
    status: 'review'
  });
};
