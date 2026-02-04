<script lang="ts">
  import type { TaskComponentProps } from "../TaskTypes";
  import {
    createDefaultScorelinePredictionConfig,
    type ScorelinePredictionConfig,
    validateScorelinePredictionConfig,
  } from "./schema";

  export let initialConfig: ScorelinePredictionConfig | null = null;
  export let onSave: TaskComponentProps<ScorelinePredictionConfig>["onSave"];
  export let onCancel: TaskComponentProps["onCancel"];

  let config: ScorelinePredictionConfig = initialConfig
    ? structuredClone(initialConfig)
    : createDefaultScorelinePredictionConfig();

  let errors: string[] = [];
  let matchSuggestions: Array<{
    league: string;
    home_team: string;
    away_team: string;
    match_time?: string;
  }> = [];
  let loadingSuggestions = false;
  let showSuggestions = false;

  async function fetchMatchSuggestions() {
    if (!config.match_date) return;

    loadingSuggestions = true;
    showSuggestions = false;
    try {
      const response = await fetch(
        `/api/match-suggestions?date=${config.match_date}&sport=${config.sport}`,
      );
      if (response.ok) {
        matchSuggestions = await response.json();
        if (matchSuggestions.length > 0) {
          showSuggestions = true;
        }
      }
    } catch (err) {
      console.error("Failed to fetch match suggestions", err);
    } finally {
      loadingSuggestions = false;
    }
  }

  function applySuggestion(suggestion: (typeof matchSuggestions)[0]) {
    config.league.name = suggestion.league;
    config.home_team.name = suggestion.home_team;
    config.away_team.name = suggestion.away_team;
    if (suggestion.match_time) {
      config.match_time = suggestion.match_time;
    }
    showSuggestions = false;
  }

  function handleSave() {
    errors = validateScorelinePredictionConfig(config);
    if (errors.length === 0) {
      onSave(config);
    }
  }

  $: teamLabel = config.sport === "tennis" ? "Player" : "Team";
  $: leagueLabel = config.sport === "tennis" ? "Tournament" : "League";
  $: if (config.match_date) {
    fetchMatchSuggestions();
  }
</script>

<div class="task-panel">
  <div class="task-section">
    <h3>⚽ Scoreline Prediction Task</h3>
    <p class="description">
      Participants will predict the final score of a match. Perfect for sports
      events, tournaments, and competitions.
    </p>

    <div class="grid-two">
      <div class="form-group">
        <label for="match-date"
          >Match Date <span class="hint">(pick first for suggestions)</span
          ></label
        >
        <input
          id="match-date"
          type="date"
          bind:value={config.match_date}
          required
        />
      </div>
      <div class="form-group">
        <label for="match-time">Match Time (Optional)</label>
        <input id="match-time" type="time" bind:value={config.match_time} />
      </div>
    </div>

    <div class="form-group">
      <label for="sport-type">Sport Type</label>
      <select id="sport-type" bind:value={config.sport}>
        <option value="football">Football/Soccer</option>
        <option value="tennis">Tennis</option>
        <option value="basketball">Basketball</option>
        <option value="other">Other</option>
      </select>
    </div>

    {#if showSuggestions && matchSuggestions.length > 0}
      <div class="suggestions-box">
        <div class="suggestions-header">
          <strong>💡 Match Suggestions for {config.match_date}</strong>
          <button
            type="button"
            class="close-btn"
            on:click={() => (showSuggestions = false)}>✕</button
          >
        </div>
        <p class="suggestions-hint">Click a match to auto-fill details</p>
        <div class="suggestions-list">
          {#each matchSuggestions as suggestion}
            <button
              type="button"
              class="suggestion-item"
              on:click={() => applySuggestion(suggestion)}
            >
              <div class="suggestion-league">{suggestion.league}</div>
              <div class="suggestion-match">
                {suggestion.home_team} vs {suggestion.away_team}
              </div>
              {#if suggestion.match_time}
                <div class="suggestion-time">⏰ {suggestion.match_time}</div>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <div class="form-group">
      <label for="league">{leagueLabel}</label>
      <input
        id="league"
        type="text"
        bind:value={config.league.name}
        placeholder={config.sport === "tennis"
          ? "e.g., ATP Tour"
          : "e.g., Premier League"}
      />
    </div>

    <div class="grid-two">
      <div class="form-group">
        <label for="home-team">{teamLabel} 1 / Home {teamLabel}</label>
        <input
          id="home-team"
          type="text"
          bind:value={config.home_team.name}
          placeholder={config.sport === "tennis"
            ? "e.g., Novak Djokovic"
            : "e.g., Manchester United"}
        />
      </div>
      <div class="form-group">
        <label for="away-team">{teamLabel} 2 / Away {teamLabel}</label>
        <input
          id="away-team"
          type="text"
          bind:value={config.away_team.name}
          placeholder={config.sport === "tennis"
            ? "e.g., Rafael Nadal"
            : "e.g., Liverpool"}
        />
      </div>
    </div>

    <div class="form-group">
      <label for="description">Additional Details (Optional)</label>
      <textarea
        id="description"
        bind:value={config.description}
        placeholder="e.g., Round of 16, Quarter Finals, etc."
        rows="3"
      ></textarea>
    </div>

    <div class="form-group">
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={config.rules.exact_score_only} />
        Exact score only (no partial points)
      </label>
      <label class="checkbox-label">
        <input
          type="checkbox"
          bind:checked={config.rules.extra_time_included}
        />
        Include extra time/overtime
      </label>
    </div>

    <div class="info-box">
      <strong>📊 How it works:</strong>
      <ul>
        <li>Participants enter their predicted score (e.g., 2-1, 3-0)</li>
        <li>
          After the match, you can verify and award points to correct
          predictions
        </li>
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
      <button type="button" class="ghost-btn" on:click={onCancel}>Cancel</button
      >
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

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: rgba(243, 243, 255, 0.9);
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: auto;
    cursor: pointer;
  }

  .suggestions-box {
    background: rgba(91, 141, 255, 0.08);
    border: 1px solid rgba(91, 141, 255, 0.2);
    border-radius: 10px;
    padding: 1rem;
    margin: 0.5rem 0;
  }

  .suggestions-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .suggestions-header strong {
    color: rgba(243, 243, 255, 0.95);
    font-size: 0.9rem;
  }

  .close-btn {
    background: none;
    border: none;
    color: rgba(243, 243, 255, 0.6);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    color: rgba(243, 243, 255, 0.9);
  }

  .suggestions-hint {
    font-size: 0.8rem;
    color: rgba(243, 243, 255, 0.6);
    margin: 0 0 0.75rem 0;
  }

  .suggestions-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .suggestion-item {
    background: rgba(26, 28, 45, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 0.75rem;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
    width: 100%;
  }

  .suggestion-item:hover {
    border-color: #5b8dff;
    background: rgba(91, 141, 255, 0.1);
  }

  .suggestion-league {
    font-size: 0.75rem;
    color: rgba(243, 243, 255, 0.6);
    margin-bottom: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .suggestion-match {
    font-size: 0.9rem;
    color: rgba(243, 243, 255, 0.95);
    font-weight: 600;
  }

  .suggestion-time {
    font-size: 0.75rem;
    color: rgba(243, 243, 255, 0.7);
    margin-top: 0.25rem;
  }

  .hint {
    font-weight: 400;
    font-size: 0.8em;
    color: rgba(91, 141, 255, 0.8);
  }
</style>
