import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

function ensureString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw error(400, `Missing or invalid ${field}`);
  }
  return value.trim();
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (err) {
    throw error(400, 'Invalid JSON payload');
  }

  const eventType = ensureString(body.event_type, 'event_type');
  if (eventType !== 'quick_event' && eventType !== 'community') {
    throw error(400, 'event_type must be either "quick_event" or "community"');
  }

  const title = ensureString(body.title, 'title');
  const description = ensureString(body.description, 'description');
  const videoUrl = typeof body.video_url === 'string' ? body.video_url.trim() : null;
  const startTime = ensureString(body.start_time, 'start_time');
  const endTime = ensureString(body.end_time, 'end_time');

  const numWinners =
    body.num_winners === null || body.num_winners === undefined
      ? null
      : Number(body.num_winners);

  if (numWinners !== null && (!Number.isInteger(numWinners) || numWinners <= 0)) {
    throw error(400, 'num_winners must be a positive integer or null');
  }

  const assets = (body.assets as Record<string, any>) ?? {};
  const banner = assets.banner ?? null;
  const logo = assets.logo ?? null;

  if (!logo || typeof logo.path !== 'string' || typeof logo.publicUrl !== 'string') {
    throw error(400, 'Logo asset is required');
  }

  const prizeDetails = body.prize_details ?? null;
  // Prize details are required for quick events, optional for communities
  if (eventType === 'quick_event' && prizeDetails === null) {
    throw error(400, 'Missing prize_details for quick event');
  }

  const tasks = Array.isArray(body.tasks) ? body.tasks : [];
  // Tasks are required for quick events, optional for communities
  if (eventType === 'quick_event' && tasks.length === 0) {
    throw error(400, 'At least one task is required for quick event');
  }

  // Calculate setup progress for community events
  let setupProgress = null;
  if (eventType === 'community') {
    const tasksProgress = tasks.length > 0 ? 100 : 0;
    const rewardsProgress = prizeDetails ? 100 : 0;
    setupProgress = { tasks: tasksProgress, rewards: rewardsProgress };
  }

  const insertPayload = {
    event_type: eventType,
    title,
    description,
    video_url: videoUrl,
    start_time: startTime,
    end_time: endTime,
    num_winners: numWinners,
    banner_path: banner?.path ?? null,
    banner_url: banner?.publicUrl ?? null,
    logo_path: logo.path,
    logo_url: logo.publicUrl,
    prize_details: prizeDetails,
    tasks: tasks,
    setup_progress: setupProgress,
    created_by: locals.user.id,
    status: 'draft'
  };

  const { data, error: insertError } = await supabaseAdmin
    .from('events')
    .insert(insertPayload)
    .select('id')
    .single();

  if (insertError) {
    console.error('Failed to insert event', insertError);
    throw error(500, 'Failed to save event');
  }

  return json({ id: data.id }, { status: 201 });
};
