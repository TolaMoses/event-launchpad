<script lang="ts">
    import { onMount } from "svelte";
    import { supabase } from "$lib/supabaseClient";

    export let config: {
        sport?: string;
        match_date?: string;
        match_time?: string;
        league?: { name: string };
        home_team?: { name: string };
        away_team?: { name: string };
        description?: string;
    };
    export let taskId: string = "";
    export let eventId: string = "";
    export let readonly = false;
    export let onComplete: (() => Promise<void>) | undefined = undefined;

    let homeScore: number | null = null;
    let awayScore: number | null = null;
    let loading = true;
    let submitting = false;
    let hasPrediction = false;
    let error = "";
    let success = "";

    onMount(async () => {
        console.log("Scoreline task config:", config);
        await loadExistingPrediction();
        loading = false;
    });

    async function loadExistingPrediction() {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Check if user has already submitted a prediction for this task
        const { data } = await supabase
            .from("task_submissions")
            .select("response")
            .eq("task_id", taskId)
            .eq("user_id", user.id)
            .single();

        if (data?.response) {
            const prediction = data.response as {
                homeScore: number;
                awayScore: number;
            };
            homeScore = prediction.homeScore;
            awayScore = prediction.awayScore;
            hasPrediction = true;
        }
    }

    async function handleSubmit() {
        if (homeScore === null || awayScore === null) {
            error = "Please enter both scores";
            return;
        }

        if (homeScore < 0 || awayScore < 0) {
            error = "Scores cannot be negative";
            return;
        }

        submitting = true;
        error = "";
        success = "";

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                error = "Please log in to submit prediction";
                return;
            }

            const prediction = {
                homeScore,
                awayScore,
                homeTeam: config.home_team?.name || "Home",
                awayTeam: config.away_team?.name || "Away",
            };

            // Upsert the prediction
            const { error: dbError } = await supabase
                .from("task_submissions")
                .upsert(
                    {
                        task_id: taskId,
                        user_id: user.id,
                        event_id: eventId,
                        response: prediction,
                        submitted_at: new Date().toISOString(),
                    },
                    {
                        onConflict: "task_id,user_id",
                    },
                );

            if (dbError) {
                throw dbError;
            }

            hasPrediction = true;
            success = hasPrediction
                ? "Prediction updated!"
                : "Prediction submitted!";

            if (onComplete) {
                await onComplete();
            }
        } catch (err) {
            error =
                err instanceof Error
                    ? err.message
                    : "Failed to submit prediction";
        } finally {
            submitting = false;
        }
    }

    function formatDate(dateStr: string | undefined): string {
        if (!dateStr) return "";
        try {
            return new Date(dateStr).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
            });
        } catch {
            return dateStr;
        }
    }

    function getHomeTeam(): string {
        return config.home_team?.name || "Home Team";
    }

    function getAwayTeam(): string {
        return config.away_team?.name || "Away Team";
    }

    function getLeague(): string {
        return config.league?.name || "";
    }
</script>

<div class="scoreline-task">
    <div class="task-header">
        <div class="task-icon">⚽</div>
        <div>
            <h4>Score Prediction</h4>
            {#if getLeague()}
                <p class="league-name">{getLeague()}</p>
            {/if}
            {#if config.match_date}
                <p class="match-date">
                    {formatDate(config.match_date)}
                    {config.match_time || ""}
                </p>
            {/if}
        </div>
    </div>

    <div class="match-display">
        <div class="team home-team">
            <span class="team-name">{getHomeTeam()}</span>
        </div>
        <span class="vs">VS</span>
        <div class="team away-team">
            <span class="team-name">{getAwayTeam()}</span>
        </div>
    </div>

    {#if config.description}
        <p class="description">{config.description}</p>
    {/if}

    <div class="prediction-form">
        {#if loading}
            <p class="loading-text">Loading...</p>
        {:else if readonly}
            {#if hasPrediction}
                <div class="prediction-display">
                    <span class="score-badge">{homeScore}</span>
                    <span class="score-separator">-</span>
                    <span class="score-badge">{awayScore}</span>
                </div>
                <p class="completed-text">Prediction submitted ✓</p>
            {:else}
                <p class="completed-text">Task completed</p>
            {/if}
        {:else}
            <div class="score-inputs">
                <div class="score-input-group">
                    <label>{getHomeTeam()}</label>
                    <input
                        type="number"
                        min="0"
                        max="99"
                        bind:value={homeScore}
                        placeholder="0"
                        disabled={submitting}
                    />
                </div>
                <span class="score-dash">-</span>
                <div class="score-input-group">
                    <label>{getAwayTeam()}</label>
                    <input
                        type="number"
                        min="0"
                        max="99"
                        bind:value={awayScore}
                        placeholder="0"
                        disabled={submitting}
                    />
                </div>
            </div>

            <button
                class="submit-btn"
                on:click={handleSubmit}
                disabled={submitting}
            >
                {#if submitting}
                    Submitting...
                {:else if hasPrediction}
                    Update Prediction
                {:else}
                    Submit Prediction
                {/if}
            </button>
        {/if}

        {#if error}
            <p class="error-message">{error}</p>
        {/if}
        {#if success}
            <p class="success-message">{success}</p>
        {/if}
    </div>
</div>

<style>
    .scoreline-task {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1.5rem;
        background: rgba(16, 185, 129, 0.05);
        border: 1px solid rgba(16, 185, 129, 0.2);
        border-radius: 12px;
    }

    .task-header {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
    }

    .task-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
    }

    h4 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: #f4f4fb;
    }

    .league-name {
        margin: 0.25rem 0 0;
        font-size: 0.85rem;
        color: rgba(243, 243, 255, 0.7);
        font-weight: 500;
    }

    .match-date {
        margin: 0.25rem 0 0;
        font-size: 0.8rem;
        color: rgba(243, 243, 255, 0.6);
    }

    .match-display {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1.5rem;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 10px;
        margin-top: 0.5rem;
    }

    .team {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
    }

    .team-name {
        font-size: 1rem;
        font-weight: 600;
        color: #f4f4fb;
        text-align: center;
    }

    .vs {
        font-size: 0.9rem;
        font-weight: 700;
        color: rgba(243, 243, 255, 0.4);
    }

    .description {
        margin: 0;
        font-size: 0.9rem;
        color: rgba(243, 243, 255, 0.7);
        line-height: 1.5;
    }

    .prediction-form {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
    }

    .score-inputs {
        display: flex;
        align-items: flex-end;
        gap: 1rem;
        justify-content: center;
    }

    .score-input-group {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }

    .score-input-group label {
        font-size: 0.8rem;
        color: rgba(243, 243, 255, 0.7);
        text-align: center;
        max-width: 100px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .score-input-group input {
        width: 60px;
        height: 50px;
        text-align: center;
        font-size: 1.5rem;
        font-weight: 700;
        background: rgba(26, 28, 45, 0.9);
        border: 2px solid rgba(16, 185, 129, 0.3);
        border-radius: 10px;
        color: #f4f4fb;
    }

    .score-input-group input:focus {
        outline: none;
        border-color: #10b981;
    }

    .score-input-group input::-webkit-outer-spin-button,
    .score-input-group input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    .score-dash {
        font-size: 1.5rem;
        font-weight: 700;
        color: rgba(243, 243, 255, 0.5);
        padding-bottom: 0.5rem;
    }

    .submit-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.75rem 2rem;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        width: fit-content;
    }

    .submit-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }

    .submit-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .prediction-display {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        justify-content: center;
    }

    .score-badge {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        font-size: 1.5rem;
        font-weight: 700;
    }

    .score-separator {
        font-size: 1.5rem;
        font-weight: 700;
        color: rgba(243, 243, 255, 0.5);
    }

    .loading-text {
        color: rgba(243, 243, 255, 0.6);
        margin: 0;
    }

    .completed-text {
        color: #10b981;
        font-weight: 600;
        margin: 0.5rem 0 0;
    }

    .error-message {
        color: #ff6b6b;
        font-size: 0.85rem;
        margin: 0;
    }

    .success-message {
        color: #10b981;
        font-size: 0.85rem;
        margin: 0;
    }
</style>
