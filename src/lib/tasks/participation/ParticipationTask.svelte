<script lang="ts">
  import type { TaskComponentProps } from "../TaskTypes";
  import {
    createDefaultParticipationTaskConfig,
    type ParticipationTaskConfig,
    validateParticipationTaskConfig
  } from "./schema";

  export let initialConfig: ParticipationTaskConfig | null = null;
  export let onSave: TaskComponentProps<ParticipationTaskConfig>["onSave"];
  export let onCancel: TaskComponentProps["onCancel"];

  let config: ParticipationTaskConfig = initialConfig
    ? structuredClone(initialConfig)
    : createDefaultParticipationTaskConfig();

  let errors: string[] = [];

  function handleSave() {
    errors = validateParticipationTaskConfig(config);
    if (errors.length === 0) {
      onSave(structuredClone(config));
    }
  }
</script>

<div class="task-panel">
  <h3>Participation Tasks</h3>
  <p class="description">
    Select the participation requirements and provide the relevant links or locations.
  </p>

  <div class="checkbox-grid">
    <label><input type="checkbox" bind:checked={config.attendLiveEvent} /> Attend live event</label>
    <label><input type="checkbox" bind:checked={config.submitFeedback} /> Submit feedback</label>
    <label><input type="checkbox" bind:checked={config.fillSurvey} /> Fill survey</label>
    <label><input type="checkbox" bind:checked={config.joinLivestream} /> Join livestream</label>
    <label><input type="checkbox" bind:checked={config.completeOnboarding} /> Complete onboarding</label>
    <label><input type="checkbox" bind:checked={config.registerAccount} /> Register account</label>
  </div>

  {#if config.attendLiveEvent}
    <div class="form-group">
      <label>Live event link or location</label>
      <input type="text" bind:value={config.eventLink} placeholder="https://event.link or venue address" />
    </div>
  {/if}

  {#if config.submitFeedback || config.fillSurvey}
    <div class="form-group">
      <label>Survey or feedback link</label>
      <input type="url" bind:value={config.surveyLink} placeholder="https://forms.gle/..." />
    </div>
  {/if}

  {#if config.joinLivestream}
    <div class="form-group">
      <label>Livestream link</label>
      <input type="url" bind:value={config.livestreamLink} placeholder="https://youtube.com/live/..." />
    </div>
  {/if}

  {#if config.completeOnboarding || config.registerAccount}
    <div class="form-group">
      <label>Onboarding / registration link</label>
      <input type="url" bind:value={config.onboardingLink} placeholder="https://app.example.com/signup" />
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

  input {
    background: rgba(26, 28, 45, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 0.65rem 0.85rem;
    color: #f3f3fb;
  }

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
