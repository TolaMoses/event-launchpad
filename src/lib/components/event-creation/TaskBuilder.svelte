<script lang="ts">
  import { taskRegistry } from '$lib/tasks';
  import { getTaskOptions } from '$lib/config/event-creation.config';
  import { clone, generateId } from '$lib/utils/event-creation.utils';
  import type { TaskTypeKey, TaskInstance } from '$lib/tasks/TaskTypes';
  import type { EventType } from '$lib/shared/types/event-creation.types';

  export let eventType: EventType = '';
  export let editingTask: TaskInstance | null = null;
  export let onSave: (task: TaskInstance) => void = () => {};
  export let onCancel: () => void = () => {};

  let selectedTaskType: TaskTypeKey | '' = '';
  let creatingTaskType: TaskTypeKey | null = null;
  let taskBuilderState: Record<string, unknown> | null = null;

  const taskOptions = getTaskOptions();

  // If editing, set the task type
  $: if (editingTask) {
    selectedTaskType = editingTask.type as TaskTypeKey;
    creatingTaskType = editingTask.type as TaskTypeKey;
  }

  function startCreateTask() {
    if (!selectedTaskType) return;
    creatingTaskType = selectedTaskType;
  }

  function handleTaskSave(event: CustomEvent) {
    const config = event.detail;
    
    const task: TaskInstance = editingTask
      ? {
          ...editingTask,
          config: clone(config)
        }
      : {
          id: generateId(),
          type: creatingTaskType || selectedTaskType,
          title: config.title || 'Untitled Task',
          points: config.points || 0,
          config: clone(config)
        };

    onSave(task);
    resetBuilder();
  }

  function handleTaskCancel() {
    resetBuilder();
    onCancel();
  }

  function resetBuilder() {
    if (!editingTask) {
      selectedTaskType = '';
    }
    creatingTaskType = null;
    taskBuilderState = null;
  }
</script>

<div class="task-builder-section">
  {#if !creatingTaskType}
    <!-- Task Type Selector -->
    <div class="task-selector">
      <label for="task-type">Select Task Type</label>
      <div class="selector-row">
        <select 
          id="task-type" 
          bind:value={selectedTaskType}
          disabled={editingTask !== null}
        >
          <option value="" disabled>Choose task category...</option>
          {#each taskOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
        <button
          type="button"
          class="add-task-button"
          class:active={selectedTaskType && !creatingTaskType}
          on:click={startCreateTask}
          disabled={!selectedTaskType}
        >
          {editingTask ? 'Edit Task' : 'Add Task'}
        </button>
      </div>
    </div>
  {:else}
    <!-- Task Builder (renders specific task component) -->
    <div class="task-builder-container">
      <div class="builder-header">
        <h3>
          {editingTask ? 'Edit' : 'Configure'} 
          {taskRegistry[creatingTaskType]?.label || 'Task'}
        </h3>
        <button
          type="button"
          class="cancel-button"
          on:click={handleTaskCancel}
        >
          Cancel
        </button>
      </div>

      <div class="builder-content">
        <svelte:component
          this={taskRegistry[creatingTaskType].component}
          initialConfig={editingTask ? clone(editingTask.config) : null}
          {eventType}
          onSave={handleTaskSave}
          onCancel={handleTaskCancel}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .task-builder-section {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .task-selector label {
    display: block;
    color: #fff;
    font-weight: 500;
    margin-bottom: 0.75rem;
  }

  .selector-row {
    display: flex;
    gap: 1rem;
  }

  select {
    flex: 1;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #fff;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  select:focus {
    outline: none;
    border-color: #8b5cf6;
    background: rgba(255, 255, 255, 0.08);
  }

  select:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  select option {
    background: #1a1a1a;
    color: #fff;
  }

  .add-task-button {
    padding: 0.75rem 1.5rem;
    background: rgba(139, 92, 246, 0.2);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 8px;
    color: #8b5cf6;
    font-weight: 500;
    cursor: not-allowed;
    transition: all 0.3s ease;
    white-space: nowrap;
  }

  .add-task-button.active {
    background: #8b5cf6;
    border-color: #8b5cf6;
    color: #fff;
    cursor: pointer;
  }

  .add-task-button.active:hover {
    background: #7c3aed;
    transform: translateY(-1px);
  }

  .add-task-button:disabled {
    cursor: not-allowed;
  }

  .task-builder-container {
    animation: slideDown 0.3s ease;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .builder-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .builder-header h3 {
    color: #fff;
    font-size: 1.25rem;
    margin: 0;
  }

  .cancel-button {
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: #aaa;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .cancel-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .builder-content {
    /* Task component will render here */
  }

  @media (max-width: 640px) {
    .selector-row {
      flex-direction: column;
    }

    .builder-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .cancel-button {
      width: 100%;
    }
  }
</style>
