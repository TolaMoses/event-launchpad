<script lang="ts">
    import type { TaskComponentProps } from "../TaskTypes";

    interface ScorelineTaskConfig {
        title: string;
        description: string;
        homeTeam: {
            name: string;
            logo: string;
        };
        awayTeam: {
            name: string;
            logo: string;
        };
        matchDate: string;
        league: string;
        points: number;
    }

    export let initialConfig: ScorelineTaskConfig | null = null;
    export let onSave: TaskComponentProps<ScorelineTaskConfig>["onSave"];
    export let onCancel: TaskComponentProps["onCancel"];

    let config: ScorelineTaskConfig = initialConfig
        ? structuredClone(initialConfig)
        : {
              title: "Score Prediction",
              description: "Predict the match score",
              homeTeam: {
                  name: "",
                  logo: "",
              },
              awayTeam: {
                  name: "",
                  logo: "",
              },
              matchDate: "",
              league: "",
              points: 15,
          };

    let errors: string[] = [];

    function validateConfig(): string[] {
        const errs: string[] = [];
        if (!config.title.trim()) errs.push("Task title is required");
        if (!config.description.trim()) errs.push("Description is required");
        if (!config.homeTeam.name.trim())
            errs.push("Home team name is required");
        if (!config.awayTeam.name.trim())
            errs.push("Away team name is required");
        if (!config.matchDate) errs.push("Match date is required");
        if (config.points < 0) errs.push("Points must be positive");
        return errs;
    }

    function handleSave() {
        errors = validateConfig();
        if (errors.length === 0) {
            onSave(structuredClone(config));
        }
    }
</script>

<div class="task-config-panel">
    <h3>Scoreline Prediction Task</h3>
    <p class="description">Let participants predict match scores</p>

    <div class="form-group">
        <label>Task Title</label>
        <input
            type="text"
            bind:value={config.title}
            placeholder="Predict the Score"
        />
    </div>

    <div class="form-group">
        <label>Description</label>
        <textarea
            rows="2"
            bind:value={config.description}
            placeholder="Predict the final score..."
        ></textarea>
    </div>

    <div class="teams-section">
        <div class="form-group">
            <label>Home Team Name</label>
            <input
                type="text"
                bind:value={config.homeTeam.name}
                placeholder="Manchester United"
            />
        </div>

        <div class="form-group">
            <label>Home Team Logo URL (Optional)</label>
            <input
                type="url"
                bind:value={config.homeTeam.logo}
                placeholder="https://..."
            />
        </div>

        <div class="vs-divider">VS</div>

        <div class="form-group">
            <label>Away Team Name</label>
            <input
                type="text"
                bind:value={config.awayTeam.name}
                placeholder="Liverpool"
            />
        </div>

        <div class="form-group">
            <label>Away Team Logo URL (Optional)</label>
            <input
                type="url"
                bind:value={config.awayTeam.logo}
                placeholder="https://..."
            />
        </div>
    </div>

    <div class="form-group">
        <label>Match Date & Time</label>
        <input type="datetime-local" bind:value={config.matchDate} />
    </div>

    <div class="form-group">
        <label>League / Competition (Optional)</label>
        <input
            type="text"
            bind:value={config.league}
            placeholder="Premier League"
        />
    </div>

    <div class="form-group">
        <label>Points</label>
        <input
            type="number"
            min="0"
            bind:value={config.points}
            placeholder="15"
        />
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
            <button type="button" class="ghost-btn" on:click={onCancel}
                >Cancel</button
            >
        {/if}
        <button type="button" class="primary-btn" on:click={handleSave}
            >Save Task</button
        >
    </div>
</div>

<style>
    .task-config-panel {
        display: flex;
        flex-direction: column;
        gap: 1.4rem;
        background: rgba(18, 20, 35, 0.9);
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 1.5rem 1.25rem;
    }

    h3 {
        margin: 0;
        font-size: 1.15rem;
        color: #f3f3fb;
    }

    .description {
        margin: 0;
        color: rgba(243, 243, 251, 0.75);
        font-size: 0.9rem;
    }

    .teams-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 10px;
    }

    .vs-divider {
        text-align: center;
        font-weight: 700;
        font-size: 1.2rem;
        color: #10b981;
        padding: 0.5rem 0;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
    }

    label {
        color: rgba(243, 243, 251, 0.9);
        font-weight: 500;
        font-size: 0.9rem;
    }

    input,
    textarea {
        background: rgba(26, 28, 45, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        padding: 0.65rem 0.85rem;
        color: #f3f3fb;
        font-size: 0.9rem;
    }

    textarea {
        resize: vertical;
        font-family: inherit;
    }

    input:focus,
    textarea:focus {
        outline: none;
        border-color: #10b981;
        background: rgba(26, 28, 45, 0.95);
    }

    .ghost-btn {
        padding: 0.5rem 0.9rem;
        background: rgba(91, 141, 255, 0.12);
        color: #8aa8ff;
        border: 1px solid rgba(91, 141, 255, 0.2);
        border-radius: 10px;
        cursor: pointer;
        font-weight: 600;
        transition: opacity 0.2s ease;
    }

    .ghost-btn:hover {
        opacity: 0.85;
    }

    .primary-btn {
        padding: 0.65rem 1.4rem;
        background: linear-gradient(135deg, #10b981, #059669);
        color: #fff;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 600;
        transition:
            opacity 0.2s ease,
            transform 0.2s ease;
    }

    .primary-btn:hover {
        opacity: 0.93;
        transform: translateY(-1px);
    }

    .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.8rem;
        margin-top: 0.5rem;
    }

    .error-box {
        background: rgba(218, 30, 40, 0.12);
        border: 1px solid rgba(218, 30, 40, 0.3);
        border-radius: 10px;
        padding: 0.9rem 1.05rem;
        color: #ffb4b4;
    }

    ul {
        margin: 0;
        padding-left: 1.25rem;
    }

    li {
        margin: 0.25rem 0;
    }
</style>
