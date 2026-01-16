import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

// POST - Submit a scoreline prediction
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

  const taskId = typeof body.taskId === 'string' ? body.taskId : '';
  const eventId = typeof body.eventId === 'string' ? body.eventId : '';
  const prediction = body.prediction as Record<string, any>;

  if (!taskId || !eventId || !prediction) {
    throw error(400, 'Missing required fields');
  }

  // Validate prediction scores
  const homeScore = prediction.home_score;
  const awayScore = prediction.away_score;

  if (typeof homeScore !== 'number' || typeof awayScore !== 'number') {
    throw error(400, 'Invalid prediction scores');
  }

  if (homeScore < 0 || awayScore < 0) {
    throw error(400, 'Scores cannot be negative');
  }

  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
    throw error(400, 'Scores must be integers');
  }

  // Check if user already submitted a prediction for this task
  const { data: existing } = await supabaseAdmin
    .from('task_submissions')
    .select('id')
    .eq('task_id', taskId)
    .eq('user_id', locals.user.id)
    .maybeSingle();

  if (existing) {
    throw error(400, 'You have already submitted a prediction for this match');
  }

  // Save the prediction
  const { data, error: insertError } = await supabaseAdmin
    .from('task_submissions')
    .insert({
      task_id: taskId,
      user_id: locals.user.id,
      submission: prediction,
      verified: false // Will be verified after match ends
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Failed to save prediction', insertError);
    throw error(500, 'Failed to save prediction');
  }

  return json({ success: true, id: data.id }, { status: 201 });
};
