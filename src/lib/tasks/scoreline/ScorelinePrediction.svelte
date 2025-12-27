<script lang="ts">
  import type { TaskComponentProps } from "../TaskTypes";
  import {
    createDefaultScorelinePredictionConfig,
    type ScorelinePredictionConfig,
    validateScorelinePredictionConfig
  } from "./schema";

  export let initialConfig: ScorelinePredictionConfig | null = null;
  export let onSave: TaskComponentProps<ScorelinePredictionConfig>["onSave"];
  export let onCancel: TaskComponentProps["onCancel"];

  let config: ScorelinePredictionConfig = initialConfig
    ? structuredClone(initialConfig)
    : createDefaultScorelinePredictionConfig();

  let errors: string[] = [];

  function handleSave() {
    errors = validateScorelinePredictionConfig(config);
    if (errors.length === 0) {
      onSave(config);
    }
  }

  $: teamLabel = config.sportType === 'tennis' ? 'Player' : 'Team';
</script>

<div class="task-panel">
  <div class="task-section">
    <h3>⚽ Scoreline Prediction Task</h3>
    <p class="description">
      Participants will predict the final score of a match. Perfect for sports events, tournaments, and competitions.
    </p>

    <div class="form-group">
      <label for="sport-type">Sport Type</label>
      <select id="sport-type" bind:value={config.sportType}>
        <option value="football">Football/Soccer</option>
        <option value="tennis">Tennis</option>
        <option value="basketball">Basketball</option>
        <option value="other">Other</option>
      </select>
    </div>

    <div class="grid-two">
      <div class="form-group">
        <label for="home-team">{teamLabel} 1 / Home {teamLabel}</label>
        <input
          id="home-team"
          type="text"
          bind:value={config.homeTeam}
          placeholder={config.sportType === 'tennis' ? 'e.g., Novak Djokovic' : 'e.g., Manchester United'}
        />
      </div>
      <div class="form-group">
        <label for="away-team">{teamLabel} 2 / Away {teamLabel}</label>
        <input
          id="away-team"
          type="text"
          bind:value={config.awayTeam}
          placeholder={config.sportType === 'tennis' ? 'e.g., Rafael Nadal' : 'e.g., Liverpool'}
        />
      </div>
    </div>

    <div class="grid-two">
      <div class="form-group">
        <label for="match-date">Match Date (Optional)</label>
        <input
          id="match-date"
          type="date"
          bind:value={config.matchDate}
        />
      </div>
      <div class="form-group">
        <label for="match-time">Match Time (Optional)</label>
        <input
          id="match-time"
          type="time"
          bind:value={config.matchTime}
        />
      </div>
    </div>

    <div class="form-group">
      <label for="description">Additional Details (Optional)</label>
      <textarea
        id="description"
        bind:value={config.description}
        placeholder="e.g., Premier League Match, Round of 16, etc."
        rows="3"
      ></textarea>
    </div>

    <div class="info-box">
      <strong>📊 How it works:</strong>
      <ul>
        <li>Participants enter their predicted score (e.g., 2-1, 3-0)</li>
        <li>After the match, you can verify and award points to correct predictions</li>
        <li>Perfect for engaging your community during live sports events</li>
      </ul>
    </div>
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
    <button type="button" class="primary-btn" on:click={handleSave}>
      Save Task
    </button>
  </div>
</div>

<style>
  .task-panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .task-section {
    background: rgba(18, 20, 35, 0.9);
    border-radius: 14px;
    padding: 1.2rem 1.1rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  h3 {
    margin: 0;
    font-size: 1.1rem;
  }

  .description {
    margin: 0;
    font-size: 0.9rem;
    color: rgba(243, 243, 255, 0.7);
    line-height: 1.5;
  }

  .grid-two {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    font-size: 0.9rem;
    font-weight: 500;
    color: rgba(243, 243, 255, 0.9);
  }

  input,
  select,
  textarea {
    background: rgba(26, 28, 45, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 0.6rem 0.75rem;
    color: #f4f4fb;
    font-family: inherit;
  }

  input:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: #5b8dff;
  }

  textarea {
    resize: vertical;
  }

  small {
    font-size: 0.8rem;
    color: rgba(243, 243, 255, 0.6);
  }

  .info-box {
    background: rgba(91, 141, 255, 0.08);
    border: 1px solid rgba(91, 141, 255, 0.2);
    border-radius: 10px;
    padding: 1rem;
    margin-top: 0.5rem;
  }

  .info-box strong {
    display: block;
    margin-bottom: 0.5rem;
    color: rgba(243, 243, 255, 0.95);
  }

  .info-box ul {
    margin: 0;
    padding-left: 1.5rem;
    color: rgba(243, 243, 255, 0.8);
    font-size: 0.9rem;
  }

  .info-box li {
    margin-bottom: 0.3rem;
  }

  .error-box {
    background: rgba(218, 30, 40, 0.1);
    border: 1px solid rgba(218, 30, 40, 0.3);
    border-radius: 10px;
    padding: 1rem;
  }

  .error-box ul {
    margin: 0;
    padding-left: 1.2rem;
    color: #ff9b9b;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .ghost-btn {
    padding: 0.6rem 1.2rem;
    background: rgba(91, 141, 255, 0.12);
    color: #8aa8ff;
    border: 1px solid rgba(91, 141, 255, 0.2);
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
  }

  .ghost-btn:hover {
    opacity: 0.85;
  }

  .primary-btn {
    padding: 0.6rem 1.5rem;
    background: linear-gradient(135deg, #5b8dff, #9f75ff);
    color: #fff;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
  }

  .primary-btn:hover {
    opacity: 0.92;
  }
</style>
