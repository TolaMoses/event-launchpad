<script lang="ts">
  import type { TaskComponentProps } from "../TaskTypes";
  import {
    createDefaultContentTaskConfig,
    type ContentTaskConfig,
    validateContentTaskConfig
  } from "./schema";

  export let initialConfig: ContentTaskConfig | null = null;
  export let onSave: TaskComponentProps<ContentTaskConfig>["onSave"];
  export let onCancel: TaskComponentProps["onCancel"];

  let config: ContentTaskConfig = initialConfig
    ? structuredClone(initialConfig)
    : createDefaultContentTaskConfig();

  let errors: string[] = [];

  function handleSave() {
    errors = validateContentTaskConfig(config);
    if (errors.length === 0) {
      onSave(structuredClone(config));
    }
  }
</script>

<div class="task-panel">
  <h3>Content Creation Tasks</h3>
  <p class="description">
    Choose the types of creative submissions required and provide instructions for creators.
  </p>

  <div class="checkbox-grid">
    <label><input type="checkbox" bind:checked={config.submitMeme} /> Submit a meme</label>
    <label><input type="checkbox" bind:checked={config.submitImage} /> Submit an image</label>
    <label><input type="checkbox" bind:checked={config.submitVideo} /> Submit a video</label>
    <label><input type="checkbox" bind:checked={config.submitExplanation} /> Submit a short explanation</label>
    <label><input type="checkbox" bind:checked={config.submitThread} /> Submit a thread</label>
    <label><input type="checkbox" bind:checked={config.submitFanArt} /> Submit fan art</label>
    <label><input type="checkbox" bind:checked={config.submitDesign} /> Submit design / logo</label>
  </div>

  <div class="form-group">
    <label>Submission method</label>
    <div class="radio-group">
      <label>
        <input type="radio" bind:group={config.submissionMethod} value="upload" />
        Upload files directly
      </label>
      <label>
        <input type="radio" bind:group={config.submissionMethod} value="link" />
        Provide external link
      </label>
      <label>
        <input type="radio" bind:group={config.submissionMethod} value="either" />
        Allow either method
      </label>
    </div>
  </div>

  <div class="form-group">
    <label>Instructions</label>
    <textarea
      rows="4"
      bind:value={config.instructions}
      placeholder="Explain what participants should create and how submissions will be judged"
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

  .checkbox-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.7rem 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  textarea {
    background: rgba(26, 28, 45, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    padding: 0.75rem;
    color: #f4f4fb;
    resize: vertical;
  }

  textarea:focus {
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
