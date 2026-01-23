<script lang="ts">
    import type { TaskComponentProps } from "../TaskTypes";

    interface ContentSubmissionConfig {
        title: string;
        description: string;
        contentType: string;
        submissionType: "link" | "text" | "file";
        points: number;
    }

    export let initialConfig: ContentSubmissionConfig | null = null;
    export let onSave: TaskComponentProps<ContentSubmissionConfig>["onSave"];
    export let onCancel: TaskComponentProps["onCancel"];

    let config: ContentSubmissionConfig = initialConfig
        ? structuredClone(initialConfig)
        : {
              title: "Content Submission",
              description: "Create and submit your content",
              contentType: "article",
              submissionType: "link",
              points: 10,
          };

    let errors: string[] = [];

    function validateConfig(): string[] {
        const errs: string[] = [];
        if (!config.title.trim()) errs.push("Task title is required");
        if (!config.description.trim()) errs.push("Description is required");
        if (!config.contentType.trim()) errs.push("Content type is required");
        if (config.points < 0) errs.push("Points must be positive");
        return errs;
    }

    function handleSave() {
        errors = validateConfig();
        if (errors.length === 0) {
            onSave(structuredClone(config));
        }
    }

    const contentTypes = [
        { value: "article", label: "Article/Blog Post" },
        { value: "video", label: "Video" },
        { value: "image", label: "Image/Art" },
        { value: "tweet", label: "Tweet/Thread" },
        { value: "code", label: "Code/Repository" },
        { value: "other", label: "Other" },
    ];

    const submissionTypes = [
        { value: "link", label: "Link (URL)" },
        { value: "text", label: "Text" },
        { value: "file", label: "File Upload" },
    ];
</script>

<div class="task-config-panel">
    <h3>Content Submission Task</h3>
    <p class="description">
        Configure a content creation task where participants submit their work
    </p>

    <div class="form-group">
        <label>Task Title</label>
        <input
            type="text"
            bind:value={config.title}
            placeholder="Create a video about..."
        />
    </div>

    <div class="form-group">
        <label>Description</label>
        <textarea
            rows="3"
            bind:value={config.description}
            placeholder="Describe what participants should create..."
        ></textarea>
    </div>

    <div class="form-group">
        <label>Content Type</label>
        <select bind:value={config.contentType}>
            {#each contentTypes as type}
                <option value={type.value}>{type.label}</option>
            {/each}
        </select>
    </div>

    <div class="form-group">
        <label>Submission Type</label>
        <select bind:value={config.submissionType}>
            {#each submissionTypes as type}
                <option value={type.value}>{type.label}</option>
            {/each}
        </select>
    </div>

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
    textarea:focus,
    select:focus {
        outline: none;
        border-color: #8b5cf6;
        background: rgba(26, 28, 45, 0.95);
    }

    select {
        cursor: pointer;
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
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
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
