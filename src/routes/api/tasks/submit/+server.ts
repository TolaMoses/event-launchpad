/**
 * Task Submission API
 * 
 * Handles task completion submission using admin access to bypass RLS
 */

import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export async function POST({ request, locals }: RequestEvent) {
    // Authentication check
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { taskId, eventId, submission, referrerId } = body;

        if (!taskId || !eventId) {
            return json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Build submission data
        const submissionData: any = {
            task_id: taskId,
            user_id: locals.user.id,
            event_id: eventId,
            submission: submission || {
                completed: true,
                verified_at: new Date().toISOString(),
            },
            verified: true,
        };

        // Include referrer if valid
        if (referrerId && referrerId !== locals.user.id) {
            submissionData.referrer_id = referrerId;
        }

        // Insert using admin (bypasses RLS)
        const { error: insertError } = await supabaseAdmin
            .from('task_submissions')
            .insert(submissionData);

        if (insertError) {
            console.error('Task submission error:', insertError);

            // Check for duplicate
            if (insertError.code === '23505') {
                return json({ error: 'Task already completed' }, { status: 409 });
            }

            return json({ error: 'Failed to save submission' }, { status: 500 });
        }

        // Also add user to event participants if not already
        await supabaseAdmin
            .from('event_participants')
            .upsert({
                event_id: eventId,
                user_id: locals.user.id,
            }, {
                onConflict: 'event_id,user_id'
            });

        return json({ success: true, message: 'Task completed successfully' });
    } catch (err) {
        console.error('Task submission exception:', err);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
