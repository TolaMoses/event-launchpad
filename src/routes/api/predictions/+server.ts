import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

// POST - Submit a scoreline prediction
export const POST: RequestHandler = async ({ request, locals }) => {
  console.log('POST /api/predictions - User:', locals.user?.id);
  
  if (!locals.user) {
    console.error('Unauthorized: No user in locals');
    throw error(401, 'Unauthorized');
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (err) {
    console.error('Invalid JSON payload:', err);
    throw error(400, 'Invalid JSON payload');
  }

  const taskId = typeof body.taskId === 'string' ? body.taskId : '';
  const eventId = typeof body.eventId === 'string' ? body.eventId : '';
  const prediction = body.prediction as Record<string, any>;

  console.log('Received prediction request:', { taskId, eventId, prediction, userId: locals.user?.id });

  if (!taskId || !eventId || !prediction) {
    console.error('Missing required fields:', { taskId, eventId, prediction });
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

  // Check if user already submitted a prediction for this event+task combination
  // Since tasks are stored as JSON in events, we use event_id and check submission JSON
  const { data: existing } = await supabaseAdmin
    .from('task_submissions')
    .select('id, submission')
    .eq('event_id', eventId)
    .eq('user_id', locals.user.id);

  // Check if any submission matches this task_id
  if (existing && existing.length > 0) {
    const alreadySubmitted = existing.some((sub: any) => 
      sub.submission?.task_id === taskId || sub.submission?.taskId === taskId
    );
    if (alreadySubmitted) {
      throw error(400, 'You have already submitted a prediction for this match');
    }
  }

  // Save the prediction with task_id in the submission JSON
  const submissionData = {
    ...prediction,
    task_id: taskId
  };

  const { data, error: insertError } = await supabaseAdmin
    .from('task_submissions')
    .insert({
      event_id: eventId,
      user_id: locals.user.id,
      submission: submissionData,
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
