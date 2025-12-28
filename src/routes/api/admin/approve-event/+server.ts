import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export const POST: RequestHandler = async ({ request, locals }) => {
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

  const { event_id, action, reason } = await request.json();

  if (!event_id || !action) {
    throw error(400, 'Missing event_id or action');
  }

  if (action !== 'approve' && action !== 'reject') {
    throw error(400, 'Invalid action. Must be "approve" or "reject"');
  }

  if (action === 'reject' && !reason) {
    throw error(400, 'Reason required for rejection');
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';

  // Update event status
  const { error: updateError } = await supabaseAdmin
    .from('events')
    .update({ status: newStatus })
    .eq('id', event_id);

  if (updateError) {
    console.error('Failed to update event status:', updateError);
    throw error(500, 'Failed to update event status');
  }

  // Create review record
  const { error: reviewError } = await supabaseAdmin
    .from('event_reviews')
    .insert({
      event_id,
      reviewer_id: locals.user.id,
      status: action === 'approve' ? 'approved' : 'rejected',
      reason: reason || null
    });

  if (reviewError) {
    console.error('Failed to create review record:', reviewError);
    throw error(500, 'Failed to create review record');
  }

  return json({ success: true, status: newStatus });
};
