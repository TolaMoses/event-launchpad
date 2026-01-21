/**
 * Predictions API - Submit Scoreline Predictions
 * 
 * Updated with simplified architecture:
 * - Rate limiting (10 requests/minute)
 * - Zod validation
 * - Cleaner logic
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import { rateLimiter, RATE_LIMITS } from '$lib/infrastructure/redis/rateLimiter';
import { validateBody } from '$lib/server/middleware/validation';
import { predictionSchema } from '$lib/shared/validation/schemas/task.schema';

export const POST: RequestHandler = async ({ request, locals }) => {
  // 1. Authentication check
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Rate limiting (10 predictions per minute per user)
  await rateLimiter.check(
    `submit-prediction:${locals.user.id}`,
    RATE_LIMITS.normal
  );

  // 3. Validate input with Zod
  const validated = await validateBody(request, predictionSchema);

  // 4. Prepare submission data
  const submissionData = {
    ...validated.prediction,
    task_id: validated.taskId
  };

  // 5. Check for existing submission and update or insert
  // First, try to find existing submission for this event+user+task
  const { data: existing } = await supabaseAdmin
    .from('task_submissions')
    .select('id')
    .eq('event_id', validated.eventId)
    .eq('user_id', locals.user.id)
    .maybeSingle();

  let data;
  let isUpdate = false;

  if (existing) {
    // Update existing submission
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('task_submissions')
      .update({
        submission: submissionData,
        verified: false // Reset verification on update
      })
      .eq('id', existing.id)
      .select('id')
      .single();

    if (updateError) {
      console.error('Failed to update prediction:', updateError);
      return json({ error: 'Failed to update prediction' }, { status: 500 });
    }

    data = updated;
    isUpdate = true;
  } else {
    // Insert new submission
    const insertData: any = {
      event_id: validated.eventId,
      user_id: locals.user.id,
      submission: submissionData,
      verified: false
    };

    // Include referrer if provided and different from user
    if (validated.referrerId && validated.referrerId !== locals.user.id) {
      insertData.referrer_id = validated.referrerId;
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('task_submissions')
      .insert(insertData)
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to save prediction:', insertError);
      return json({ error: 'Failed to save prediction' }, { status: 500 });
    }

    data = inserted;
  }

  return json(
    {
      success: true,
      id: data.id,
      updated: isUpdate
    },
    { status: isUpdate ? 200 : 201 }
  );
};
