import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import { syncTasksToTable } from '$lib/server/syncTasks';
import { rateLimiter, RATE_LIMITS } from '$lib/infrastructure/redis/rateLimiter';
import { validateBody } from '$lib/server/middleware/validation';
import { eventCreateSchema } from '$lib/shared/validation/schemas/event.schema';

export const POST: RequestHandler = async ({ request, locals }) => {
  // 1. Authentication check
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Rate limiting (5 events per hour to prevent spam)
  await rateLimiter.check(
    `create-event:${locals.user.id}`,
    RATE_LIMITS.creation
  );

  // 3. Validate input with Zod
  const validated = await validateBody(request, eventCreateSchema);

  // 4. Prepare insert payload
  const insertPayload: any = {
    title: validated.title,
    description: validated.description,
    video_url: validated.video_url || null,
    start_time: validated.start_time,
    end_time: validated.end_time,
    num_winners: validated.num_winners || null,
    banner_path: validated.assets?.banner?.path || null,
    banner_url: validated.assets?.banner?.publicUrl || null,
    logo_path: validated.assets?.logo.path,
    logo_url: validated.assets?.logo.publicUrl,
    // Use reward_types (new system)
    reward_types: validated.reward_types,
    // Keep prize_details for backwards compatibility (first reward)
    prize_details: validated.reward_types[0] || null,
    tasks: validated.tasks,
    created_by: locals.user.id,
    status: 'review' // All events start in review status
  };

  // Include optional fields if provided
  if (validated.point_system) {
    insertPayload.point_system = validated.point_system;
  }
  if (validated.roles_permissions) {
    insertPayload.roles_permissions = validated.roles_permissions;
  }

  // 5. Insert event
  const { data, error: insertError } = await supabaseAdmin
    .from('events')
    .insert(insertPayload)
    .select('id')
    .single();

  if (insertError) {
    console.error('Failed to insert event:', insertError);
    return json(
      { error: 'Failed to create event. Please try again.' },
      { status: 500 }
    );
  }

  // 6. Sync tasks to tasks table for FK relationships
  if (validated.tasks && validated.tasks.length > 0) {
    const syncResult = await syncTasksToTable(data.id, validated.tasks);
    if (!syncResult.success) {
      console.warn('Task sync warning:', syncResult.error);
      // Don't fail event creation, just log warning
    }
  }

  return json(
    { success: true, id: data.id },
    { status: 201 }
  );
};
