<script lang="ts">
  import type { TaskComponentProps } from "../TaskTypes";
  import {
    createDefaultIrlTaskConfig,
    type IrlTaskConfig,
    validateIrlTaskConfig
  } from "./schema";

  export let initialConfig: IrlTaskConfig | null = null;
  export let onSave: TaskComponentProps<IrlTaskConfig>["onSave"];
  export let onCancel: TaskComponentProps["onCancel"];

  let config: IrlTaskConfig = initialConfig
    ? structuredClone(initialConfig)
    : createDefaultIrlTaskConfig();

  let errors: string[] = [];

  function handleSave() {
    errors = validateIrlTaskConfig(config);
    if (errors.length === 0) {
      onSave(structuredClone(config));
    }
  }
</script>

<div class="task-panel">
  <h3>IRL Tasks</h3>
  <p class="description">
    Define in-person or real-world tasks, including proof requirements and optional QR code scans.
  </p>

  <div class="checkbox-grid">
    <label><input type="checkbox" bind:checked={config.takePhoto} /> Take a photo at location</label>
    <label><input type="checkbox" bind:checked={config.attendMeetup} /> Attend meetup</label>
    <label><input type="checkbox" bind:checked={config.scanQr} /> Scan QR code</label>
    <label><input type="checkbox" bind:checked={config.physicalChallenge} /> Complete physical challenge</label>
  </div>

  <div class="form-group">
    <label>Description</label>
    <textarea
      rows="4"
      bind:value={config.description}
      placeholder="Explain the IRL activity and where it takes place"
    ></textarea>
  </div>

  {#if config.scanQr}
    <div class="form-group">
      <label>QR code value</label>
      <input type="text" bind:value={config.qrCodeValue} placeholder="secret-code-123" />
    </div>
  {/if}

  {#if config.takePhoto || config.physicalChallenge}
    <div class="form-group">
      <label>Proof requirements</label>
      <textarea
        rows="3"
        bind:value={config.proofRequirements}
        placeholder="Describe the photo or proof participants must submit"
      ></textarea>
    </div>
  {/if}

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

  input,
  textarea {
    background: rgba(26, 28, 45, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 0.65rem 0.85rem;
    color: #f3f3fb;
  }

  textarea {
    resize: vertical;
  }

  input:focus,
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
