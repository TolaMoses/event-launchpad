<script lang="ts">
  import { getTaskLabel, summariseTask } from "$lib/utils/event-creation.utils";
  import type { TaskInstance } from "$lib/tasks/TaskTypes";

  export let tasks: TaskInstance[] = [];
  export let onEdit: (index: number) => void = () => {};
  export let onDelete: (index: number) => void = () => {};
  export let onMoveUp: (index: number) => void = () => {};
  export let onMoveDown: (index: number) => void = () => {};

  function handleDelete(index: number) {
    if (confirm("Are you sure you want to delete this task?")) {
      onDelete(index);
    }
  }
</script>

<div class="task-list">
  <div class="list-header">
    <h3>Tasks ({tasks.length})</h3>
    {#if tasks.length > 0}
      <p class="hint">Click to edit, drag to reorder</p>
    {/if}
  </div>

  {#if tasks.length === 0}
    <div class="empty-state">
      <p>No tasks added yet</p>
      <span class="empty-hint">Add tasks for participants to complete</span>
    </div>
  {:else}
    <div class="tasks">
      {#each tasks as task, index}
        <div class="task-card" data-index={index}>
          <div class="task-header">
            <div class="task-info">
              <span class="task-type">{getTaskLabel(task.type)}</span>
              <h4>{task.config?.title || "Untitled Task"}</h4>
            </div>
          </div>

          {#if task.config}
            <div class="task-summary">
              {summariseTask(task)}
            </div>
          {/if}

          <div class="task-actions">
            <!-- Reorder buttons -->
            <div class="reorder-buttons">
              <button
                type="button"
                class="icon-button"
                disabled={index === 0}
                on:click={() => onMoveUp(index)}
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                class="icon-button"
                disabled={index === tasks.length - 1}
                on:click={() => onMoveDown(index)}
                title="Move down"
              >
                ↓
              </button>
            </div>

            <!-- Edit/Delete buttons -->
            <div class="action-buttons">
              <button
                type="button"
                class="edit-button"
                on:click={() => onEdit(index)}
              >
                Edit
              </button>
              <button
                type="button"
                class="delete-button"
                on:click={() => handleDelete(index)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .task-list {
    margin-bottom: 2rem;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  h3 {
    color: #fff;
    font-size: 1.25rem;
    margin: 0;
  }

  .hint {
    color: #888;
    font-size: 0.875rem;
    margin: 0;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 2rem;
    background: rgba(255, 255, 255, 0.02);
    border: 2px dashed rgba(255, 255, 255, 0.1);
    border-radius: 12px;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .empty-state p {
    color: #aaa;
    font-size: 1.125rem;
    margin-bottom: 0.5rem;
  }

  .empty-hint {
    color: #666;
    font-size: 0.875rem;
  }

  .tasks {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .task-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1.5rem;
    transition: all 0.3s ease;
  }

  .task-card:hover {
    border-color: rgba(139, 92, 246, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }

  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .task-info {
    flex: 1;
  }

  .task-type {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: rgba(139, 92, 246, 0.2);
    color: #a78bfa;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.5rem;
  }

  .task-info h4 {
    color: #fff;
    font-size: 1.125rem;
    margin: 0.5rem 0 0 0;
  }

  .points-badge {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    font-weight: 600;
    border-radius: 8px;
    font-size: 0.875rem;
  }

  .task-summary {
    color: #aaa;
    font-size: 0.875rem;
    line-height: 1.5;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
  }

  .task-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .reorder-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .icon-button {
    width: 36px;
    height: 36px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 1.125rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-button:hover:not(:disabled) {
    background: rgba(139, 92, 246, 0.2);
    border-color: #8b5cf6;
  }

  .icon-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .action-buttons {
    display: flex;
    gap: 0.75rem;
  }

  .edit-button,
  .delete-button {
    padding: 0.5rem 1rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .edit-button {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border-color: rgba(59, 130, 246, 0.3);
  }

  .edit-button:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: #3b82f6;
  }

  .delete-button {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.3);
  }

  .delete-button:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: #ef4444;
  }

  @media (max-width: 640px) {
    .task-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .reorder-buttons,
    .action-buttons {
      justify-content: center;
    }
  }
</style>
