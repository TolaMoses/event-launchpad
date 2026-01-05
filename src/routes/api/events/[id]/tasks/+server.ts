import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

/**
 * Add or update tasks for a community event
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

  const tasks = Array.isArray(body.tasks) ? body.tasks : [];

  if (tasks.length === 0) {
    throw error(400, 'At least one task is required');
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
    throw error(403, 'Only the event creator can add tasks');
  }

  // Only community events in draft status can add tasks this way
  if (event.event_type !== 'community') {
    throw error(400, 'Only community events can add tasks after creation');
  }

  if (event.status !== 'draft') {
    throw error(400, 'Tasks can only be added to draft events');
  }

  // Update tasks and setup progress
  const setupProgress = {
    tasks: 100,
    rewards: event.setup_progress?.rewards || 0
  };

  const { error: updateError } = await supabaseAdmin
    .from('events')
    .update({
      tasks: tasks,
      setup_progress: setupProgress
    })
    .eq('id', eventId);

  if (updateError) {
    console.error('Failed to update tasks:', updateError);
    throw error(500, 'Failed to add tasks');
  }

  return json({ 
    success: true, 
    message: 'Tasks added successfully',
    setupProgress
  });
};
