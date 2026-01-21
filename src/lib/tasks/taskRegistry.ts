/**
 * Task Registry Re-export
 * 
 * This file now re-exports from the consolidated task registry.
 * Update your imports to use '$lib/tasks' instead of '$lib/tasks/taskRegistry'
 * for better consistency.
 */

export { taskRegistry, type TaskType } from './CONSOLIDATED_taskRegistry';
export type { TaskRegistry, TaskRegistryEntry } from './TaskTypes';
