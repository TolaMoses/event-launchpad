<script lang="ts">
    import type { TaskComponentProps } from "../TaskTypes";

    interface TwitterTaskConfig {
        title: string;
        description: string;
        points: number;
        twitter: {
            followAccount: boolean;
            likePost: boolean;
            retweetPost: boolean;
            commentPost: boolean;
            quotePost: boolean;
            profileLink: string;
            postLink: string;
        };
    }

    export let initialConfig: TwitterTaskConfig | null = null;
    export let onSave: TaskComponentProps<TwitterTaskConfig>["onSave"];
    export let onCancel: TaskComponentProps["onCancel"];

    let config: TwitterTaskConfig = initialConfig
        ? structuredClone(initialConfig)
        : {
              title: "Twitter Task",
              description: "Complete the Twitter actions",
              points: 10,
              twitter: {
                  followAccount: false,
                  likePost: false,
                  retweetPost: false,
                  commentPost: false,
                  quotePost: false,
                  profileLink: "",
                  postLink: "",
              },
          };

    let errors: string[] = [];

    function validateConfig(): string[] {
        const errs: string[] = [];
        if (!config.title.trim()) errs.push("Task title is required");
        if (!config.description.trim()) errs.push("Description is required");
        if (config.points < 0) errs.push("Points must be positive");

        const hasAction =
            config.twitter.followAccount ||
            config.twitter.likePost ||
            config.twitter.retweetPost ||
            config.twitter.commentPost ||
            config.twitter.quotePost;
        if (!hasAction) errs.push("Select at least one Twitter action");

        if (
            config.twitter.followAccount &&
            !config.twitter.profileLink.trim()
        ) {
            errs.push("Profile link is required for follow action");
        }
        if (
            (config.twitter.likePost ||
                config.twitter.retweetPost ||
                config.twitter.commentPost ||
                config.twitter.quotePost) &&
            !config.twitter.postLink.trim()
        ) {
            errs.push("Post link is required for post actions");
        }

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
    <h3>Twitter / X Task</h3>
    <p class="description">Configure a Twitter (X) social media task</p>

    <div class="form-group">
        <label>Task Title</label>
        <input
            type="text"
            bind:value={config.title}
            placeholder="Follow us on Twitter"
        />
    </div>

    <div class="form-group">
        <label>Description</label>
        <textarea
            rows="2"
            bind:value={config.description}
            placeholder="Complete these Twitter actions..."
        ></textarea>
    </div>

    <div class="form-group">
        <label>Select Actions</label>
        <div class="checkbox-group">
            <label class="checkbox-label">
                <input
                    type="checkbox"
                    bind:checked={config.twitter.followAccount}
                />
                <span>Follow Account</span>
            </label>
            <label class="checkbox-label">
                <input type="checkbox" bind:checked={config.twitter.likePost} />
                <span>Like Post</span>
            </label>
            <label class="checkbox-label">
                <input
                    type="checkbox"
                    bind:checked={config.twitter.retweetPost}
                />
                <span>Retweet</span>
            </label>
            <label class="checkbox-label">
                <input
                    type="checkbox"
                    bind:checked={config.twitter.commentPost}
                />
                <span>Comment on Post</span>
            </label>
            <label class="checkbox-label">
                <input
                    type="checkbox"
                    bind:checked={config.twitter.quotePost}
                />
                <span>Quote Tweet</span>
            </label>
        </div>
    </div>

    {#if config.twitter.followAccount}
        <div class="form-group">
            <label>Profile Link</label>
            <input
                type="url"
                bind:value={config.twitter.profileLink}
                placeholder="https://twitter.com/username"
            />
        </div>
    {/if}

    {#if config.twitter.likePost || config.twitter.retweetPost || config.twitter.commentPost || config.twitter.quotePost}
        <div class="form-group">
            <label>Post Link</label>
            <input
                type="url"
                bind:value={config.twitter.postLink}
                placeholder="https://twitter.com/username/status/..."
            />
        </div>
    {/if}

    <div class="form-group">
        <label>Points</label>
        <input
            type="number"
            min="0"
            bind:value={config.points}
            placeholder="10"
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
    textarea,
    select {
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
        border-color: #1da1f2;
        background: rgba(26, 28, 45, 0.95);
    }

    .checkbox-group {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 8px;
        transition: background 0.2s;
    }

    .checkbox-label:hover {
        background: rgba(255, 255, 255, 0.05);
    }

    .checkbox-label input[type="checkbox"] {
        width: auto;
        cursor: pointer;
    }

    .checkbox-label span {
        color: rgba(243, 243, 251, 0.9);
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
        background: linear-gradient(135deg, #1da1f2, #1a8cd8);
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
