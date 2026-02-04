/**
 * Task Sync Utility
 * 
 * Syncs tasks from events.tasks JSON to the tasks table
 * for proper FK relationships with task_submissions
 */

import { supabaseAdmin } from './supabaseAdmin';

export interface TaskFromJson {
    id?: string;
    type: string;
    config: Record<string, any>;
    required?: boolean;
}

/**
 * Sync tasks from JSON array to the tasks table
 * @param eventId - The event ID
 * @param tasks - Array of tasks from events.tasks JSON
 */
export async function syncTasksToTable(
    eventId: string,
    tasks: TaskFromJson[]
): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Delete existing tasks for this event
        const { error: deleteError } = await supabaseAdmin
            .from('tasks')
            .delete()
            .eq('event_id', eventId);

        if (deleteError) {
            console.error('Failed to delete old tasks:', deleteError);
            // Continue anyway - old tasks may not exist
        }

        // 2. Insert new tasks
        if (tasks.length > 0) {
            const taskRows = tasks.map((task, index) => ({
                id: task.id || crypto.randomUUID(), // Use existing ID or generate new one
                event_id: eventId,
                type: task.type,
                config: task.config,
                required: task.required || false,
                order_index: index
            }));

            const { error: insertError } = await supabaseAdmin
                .from('tasks')
                .insert(taskRows);

            if (insertError) {
                console.error('Failed to insert tasks:', insertError);
                return { success: false, error: insertError.message };
            }
        }

        return { success: true };
    } catch (err) {
        console.error('Task sync exception:', err);
        return { success: false, error: 'Task sync failed' };
    }
}
