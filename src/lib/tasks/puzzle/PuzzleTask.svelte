<script lang="ts">
  import type { TaskComponentProps } from "../TaskTypes";
  import {
    createDefaultPuzzleTaskConfig,
    type PuzzleTaskConfig,
    validatePuzzleTaskConfig
  } from "./schema";

  export let initialConfig: PuzzleTaskConfig | null = null;
  export let onSave: TaskComponentProps<PuzzleTaskConfig>["onSave"];
  export let onCancel: TaskComponentProps["onCancel"];

  let config: PuzzleTaskConfig = initialConfig
    ? structuredClone(initialConfig)
    : createDefaultPuzzleTaskConfig();

  let errors: string[] = [];

  function handleSave() {
    errors = validatePuzzleTaskConfig(config);
    if (errors.length === 0) {
      onSave(structuredClone(config));
    }
  }
</script>

<div class="task-panel">
  <h3>Puzzle / Riddle Task</h3>
  <p class="description">
    Define the puzzle or riddle players must solve. Provide the expected answer used for
    verification.
  </p>

  <div class="form-group">
    <label>Instructions</label>
    <textarea
      rows="4"
      bind:value={config.instructions}
      placeholder="Describe the puzzle or riddle that players need to solve"
    ></textarea>
  </div>

  <div class="form-group">
    <label>Correct answer</label>
    <input
      type="text"
      bind:value={config.expectedAnswer}
      placeholder="The correct response participants must submit"
    />
  </div>

  <div class="form-group">
    <label>Hint (optional)</label>
    <textarea
      rows="2"
      bind:value={config.hint}
      placeholder="Provide an optional hint to help participants"
    ></textarea>
  </div>

  {#if errors.length}
    <div class="error-box">
      <ul>
        {#each errors as err}
          <li>{err}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <div class="actions">
    {#if onCancel}
      <button type="button" class="ghost-btn" on:click={onCancel}>Cancel</button>
    {/if}
    <button type="button" class="primary-btn" on:click={handleSave}>Save Task</button>
  </div>
</div>

<style>
  .task-panel {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    background: rgba(18, 20, 35, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 1.4rem 1.2rem;
  }

  h3 {
    margin: 0;
    font-size: 1.1rem;
  }

  .description {
    margin: 0;
    color: rgba(243, 243, 251, 0.75);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  textarea,
  input {
    background: rgba(26, 28, 45, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 0.65rem 0.85rem;
    color: #f3f3fb;
  }

  textarea {
    resize: vertical;
  }

  textarea:focus,
  input:focus {
    outline: none;
    border-color: #5b8dff;
  }

  .ghost-btn {
    padding: 0.5rem 0.9rem;
    background: rgba(91, 141, 255, 0.12);
    color: #8aa8ff;
    border: 1px solid rgba(91, 141, 255, 0.2);
    border-radius: 10px;
    cursor: pointer;
  }

  .ghost-btn:hover {
    opacity: 0.85;
  }

  .primary-btn {
    padding: 0.6rem 1.35rem;
    background: linear-gradient(135deg, #5b8dff, #9f75ff);
    color: #fff;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .primary-btn:hover {
    opacity: 0.93;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .error-box {
    background: rgba(218, 30, 40, 0.12);
    border: 1px solid rgba(218, 30, 40, 0.3);
    border-radius: 10px;
    padding: 0.85rem 1rem;
    color: #ffb4b4;
  }

  ul {
    margin: 0;
    padding-left: 1.25rem;
  }
</style>
