<script lang="ts">
  import { taskRegistry } from "$lib/tasks";
  import { getTaskOptions } from "$lib/config/event-creation.config";
  import { clone, generateId } from "$lib/utils/event-creation.utils";
  import type { TaskTypeKey, TaskInstance } from "$lib/tasks/TaskTypes";

  export let editingTask: TaskInstance | null = null;
  export let onSave: (task: TaskInstance) => void = () => {};
  export let onCancel: () => void = () => {};

  let selectedTaskTypes: Set<TaskTypeKey> = new Set();
  let creatingTaskType: TaskTypeKey | null = null;
  let taskBuilderState: Record<string, unknown> | null = null;
  let pendingTaskTypes: TaskTypeKey[] = [];

  const taskOptions = getTaskOptions();

  // If editing, set the task type
  $: if (editingTask) {
    creatingTaskType = editingTask.type as TaskTypeKey;
  }

  function toggleTaskType(taskType: TaskTypeKey) {
    if (selectedTaskTypes.has(taskType)) {
      selectedTaskTypes.delete(taskType);
    } else {
      selectedTaskTypes.add(taskType);
    }
    selectedTaskTypes = new Set(selectedTaskTypes); // Trigger reactivity
  }

  function startCreateTasks() {
    if (selectedTaskTypes.size === 0) return;

    pendingTaskTypes = Array.from(selectedTaskTypes);
    creatingTaskType = pendingTaskTypes[0];
  }

  function handleTaskSave(event: CustomEvent) {
    const config = event.detail;

    const task: TaskInstance = editingTask
      ? {
          ...editingTask,
          config: clone(config),
        }
      : {
          id: generateId(),
          type: creatingTaskType || pendingTaskTypes[0],
          title: config.title || "Untitled Task",
          points: config.points || 0,
          config: clone(config),
        };

    onSave(task);

    // If we have more pending tasks, move to the next one
    if (!editingTask && pendingTaskTypes.length > 1) {
      pendingTaskTypes = pendingTaskTypes.slice(1);
      creatingTaskType = pendingTaskTypes[0];
      taskBuilderState = null;
    } else {
      resetBuilder();
    }
  }

  function handleTaskCancel() {
    resetBuilder();
    onCancel();
  }

  function resetBuilder() {
    if (!editingTask) {
      selectedTaskTypes = new Set();
      pendingTaskTypes = [];
    }
    // Always reset creatingTaskType to return to task selection
    creatingTaskType = null;
    taskBuilderState = null;
  }
</script>

<div class="task-builder-section">
  {#if !creatingTaskType}
    <!-- Task Type Selector -->
    <div class="task-selector">
      <label>Select Task Types</label>
      <p class="helper-text">
        Select one or more task types to add to your event
      </p>

      <div class="checkbox-grid">
        {#each taskOptions as option}
          <label class="checkbox-option">
            <input
              type="checkbox"
              value={option.value}
              checked={selectedTaskTypes.has(option.value as TaskTypeKey)}
              on:change={() => toggleTaskType(option.value as TaskTypeKey)}
              disabled={editingTask !== null}
            />
            <span class="checkbox-label">{option.label}</span>
          </label>
        {/each}
      </div>

      <button
        type="button"
        class="add-tasks-button"
        class:active={selectedTaskTypes.size > 0 && !creatingTaskType}
        on:click={startCreateTasks}
        disabled={selectedTaskTypes.size === 0}
      >
        {editingTask
          ? "Edit Task"
          : selectedTaskTypes.size > 0
            ? `Add ${selectedTaskTypes.size} Task${selectedTaskTypes.size > 1 ? "s" : ""}`
            : "Add Tasks"}
      </button>
    </div>
  {:else}
    <!-- Task Builder (renders specific task component) -->
    <div class="task-builder-container">
      <div class="builder-header">
        <h3>
          {editingTask ? "Edit" : "Configure"}
          {taskRegistry[creatingTaskType]?.label || "Task"}
          {#if !editingTask && pendingTaskTypes.length > 1}
            <span class="progress-indicator"
              >({pendingTaskTypes.length -
                pendingTaskTypes.indexOf(creatingTaskType)} of {pendingTaskTypes.length})</span
            >
          {/if}
        </h3>
        <button type="button" class="cancel-button" on:click={handleTaskCancel}>
          Cancel
        </button>
      </div>

      <div class="builder-content">
        <svelte:component
          this={taskRegistry[creatingTaskType].component}
          initialConfig={editingTask ? clone(editingTask.config) : null}
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
    margin-bottom: 0.5rem;
  }

  .helper-text {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0 0 1rem;
  }

  .checkbox-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .checkbox-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .checkbox-option:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(139, 92, 246, 0.3);
  }

  .checkbox-option input[type="checkbox"] {
    cursor: pointer;
    width: 18px;
    height: 18px;
    accent-color: #8b5cf6;
  }

  .checkbox-option input[type="checkbox"]:disabled {
    cursor: not-allowed;
  }

  .checkbox-label {
    color: #fff;
    font-size: 0.9rem;
    user-select: none;
  }

  .add-tasks-button {
    padding: 0.75rem 1.5rem;
    background: rgba(139, 92, 246, 0.2);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 8px;
    color: #8b5cf6;
    font-weight: 500;
    cursor: not-allowed;
    transition: all 0.3s ease;
    white-space: nowrap;
    width: 100%;
  }

  .add-tasks-button.active {
    background: #8b5cf6;
    border-color: #8b5cf6;
    color: #fff;
    cursor: pointer;
  }

  .add-tasks-button.active:hover {
    background: #7c3aed;
    transform: translateY(-1px);
  }

  .add-tasks-button:disabled {
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

  .progress-indicator {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 400;
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

  @media (max-width: 768px) {
    .checkbox-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
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
