/**
 * CONSOLIDATED Task Registry Export
 * 
 * This file now re-exports from the consolidated task registry
 * to maintain backwards compatibility while fixing the duplicate registry issue.
 */

export { taskRegistry, type TaskType, type TaskRegistry, type TaskRegistryEntry } from './CONSOLIDATED_taskRegistry';
export type { TaskTypeKey, TaskInstance, TaskComponentProps } from './TaskTypes';
