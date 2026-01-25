<script lang="ts">
    import { onMount } from "svelte";
    import type { TaskComponentProps } from "../TaskTypes";

    interface TelegramTaskConfig {
        title: string;
        description: string;
        telegram: {
            joinChannel: boolean;
            joinGroup: boolean;
            channelLink: string;
            groupLink: string;
            channelId: string;
            groupId: string;
        };
    }

    export let initialConfig: TelegramTaskConfig | null = null;
    export let onSave: TaskComponentProps<TelegramTaskConfig>["onSave"];
    export let onCancel: TaskComponentProps["onCancel"];

    let config: TelegramTaskConfig = initialConfig
        ? structuredClone(initialConfig)
        : {
              title: "Telegram Task",
              description: "Join our Telegram community",
              telegram: {
                  joinChannel: false,
                  joinGroup: false,
                  channelLink: "",
                  groupLink: "",
                  channelId: "",
                  groupId: "",
              },
          };

    let errors: string[] = [];

    // Bot info
    let botUsername = "";
    let loadingBot = true;

    // Verification status
    let channelBotStatus: "unknown" | "checking" | "success" | "error" =
        "unknown";
    let groupBotStatus: "unknown" | "checking" | "success" | "error" =
        "unknown";
    let channelBotError = "";
    let groupBotError = "";

    onMount(async () => {
        await loadBotInfo();
    });

    async function loadBotInfo() {
        loadingBot = true;
        try {
            const response = await fetch("/api/config/telegram-bot");
            const data = await response.json();
            botUsername = data.username || "@YourBot";
        } catch (err) {
            console.error("Failed to load bot info:", err);
            botUsername = "@YourBot";
        } finally {
            loadingBot = false;
        }
    }

    async function verifyChannelBot() {
        if (!config.telegram.channelId.trim()) {
            channelBotError = "Enter a channel ID first";
            return;
        }

        channelBotStatus = "checking";
        channelBotError = "";

        try {
            const response = await fetch("/api/auth/telegram/verify-bot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chatId: config.telegram.channelId }),
            });

            const data = await response.json();

            if (data.botInChat) {
                channelBotStatus = "success";
            } else {
                channelBotStatus = "error";
                channelBotError =
                    data.error || "Bot cannot access this channel";
            }
        } catch (err) {
            channelBotStatus = "error";
            channelBotError = "Failed to verify bot access";
        }
    }

    async function verifyGroupBot() {
        if (!config.telegram.groupId.trim()) {
            groupBotError = "Enter a group ID first";
            return;
        }

        groupBotStatus = "checking";
        groupBotError = "";

        try {
            const response = await fetch("/api/auth/telegram/verify-bot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chatId: config.telegram.groupId }),
            });

            const data = await response.json();

            if (data.botInChat) {
                groupBotStatus = "success";
            } else {
                groupBotStatus = "error";
                groupBotError = data.error || "Bot cannot access this group";
            }
        } catch (err) {
            groupBotStatus = "error";
            groupBotError = "Failed to verify bot access";
        }
    }

    function validateConfig(): string[] {
        const errs: string[] = [];
        if (!config.title.trim()) errs.push("Task title is required");
        if (!config.description.trim()) errs.push("Description is required");

        if (!config.telegram.joinChannel && !config.telegram.joinGroup) {
            errs.push("Select at least one Telegram action");
        }

        if (config.telegram.joinChannel) {
            if (!config.telegram.channelLink.trim()) {
                errs.push("Channel link is required");
            }
            if (!config.telegram.channelId.trim()) {
                errs.push("Channel ID is required for verification");
            }
        }

        if (config.telegram.joinGroup) {
            if (!config.telegram.groupLink.trim()) {
                errs.push("Group link is required");
            }
            if (!config.telegram.groupId.trim()) {
                errs.push("Group ID is required for verification");
            }
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
    <h3>Telegram Task</h3>
    <p class="description">Configure a Telegram community task</p>

    <!-- Bot Setup Instructions -->
    <div class="bot-info-section">
        <h4>Setup Instructions</h4>
        <div class="instructions">
            <ol>
                <li>
                    Add <strong>{loadingBot ? "..." : botUsername}</strong> to your
                    channel/group as admin
                </li>
                <li>
                    Get your chat ID (channel/group) - usually starts with <code
                        >-100</code
                    >
                </li>
                <li>Enter the chat ID below and verify bot access</li>
            </ol>
        </div>
        <p class="hint">
            To get chat ID: Add <a
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noopener">@userinfobot</a
            > to your group temporarily, it will show the chat ID.
        </p>
    </div>

    <div class="form-group">
        <label for="task-title">Task Title</label>
        <input
            id="task-title"
            type="text"
            bind:value={config.title}
            placeholder="Join our Telegram"
        />
    </div>

    <div class="form-group">
        <label for="description">Description</label>
        <textarea
            id="description"
            rows="2"
            bind:value={config.description}
            placeholder="Join our community on Telegram..."
        ></textarea>
    </div>

    <div class="form-group">
        <label>Select Actions</label>
        <div class="checkbox-group">
            <label class="checkbox-label">
                <input
                    type="checkbox"
                    bind:checked={config.telegram.joinChannel}
                />
                <span>Join Telegram Channel</span>
            </label>
            <label class="checkbox-label">
                <input
                    type="checkbox"
                    bind:checked={config.telegram.joinGroup}
                />
                <span>Join Telegram Group</span>
            </label>
        </div>
    </div>

    {#if config.telegram.joinChannel}
        <div class="channel-config">
            <div class="form-group">
                <label for="channel-link">Channel Link</label>
                <input
                    id="channel-link"
                    type="url"
                    bind:value={config.telegram.channelLink}
                    placeholder="https://t.me/yourchannel"
                />
                <span class="hint">Public link for participants to join</span>
            </div>

            <div class="form-group">
                <label for="channel-id">Channel ID *</label>
                <div class="id-input-row">
                    <input
                        id="channel-id"
                        type="text"
                        bind:value={config.telegram.channelId}
                        placeholder="-1001234567890"
                    />
                    <button
                        type="button"
                        class="verify-button"
                        on:click={verifyChannelBot}
                        disabled={channelBotStatus === "checking"}
                    >
                        {channelBotStatus === "checking" ? "..." : "Verify"}
                    </button>
                </div>
                {#if channelBotStatus === "success"}
                    <span class="status-success">✓ Bot has access</span>
                {:else if channelBotStatus === "error"}
                    <span class="status-error">{channelBotError}</span>
                {/if}
            </div>
        </div>
    {/if}

    {#if config.telegram.joinGroup}
        <div class="group-config">
            <div class="form-group">
                <label for="group-link">Group Link</label>
                <input
                    id="group-link"
                    type="url"
                    bind:value={config.telegram.groupLink}
                    placeholder="https://t.me/yourgroup"
                />
                <span class="hint">Public link for participants to join</span>
            </div>

            <div class="form-group">
                <label for="group-id">Group ID *</label>
                <div class="id-input-row">
                    <input
                        id="group-id"
                        type="text"
                        bind:value={config.telegram.groupId}
                        placeholder="-1001234567890"
                    />
                    <button
                        type="button"
                        class="verify-button"
                        on:click={verifyGroupBot}
                        disabled={groupBotStatus === "checking"}
                    >
                        {groupBotStatus === "checking" ? "..." : "Verify"}
                    </button>
                </div>
                {#if groupBotStatus === "success"}
                    <span class="status-success">✓ Bot has access</span>
                {:else if groupBotStatus === "error"}
                    <span class="status-error">{groupBotError}</span>
                {/if}
            </div>
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

    h4 {
        margin: 0 0 0.75rem 0;
        font-size: 1rem;
        color: #f3f3fb;
    }

    .description {
        margin: 0;
        color: rgba(243, 243, 251, 0.75);
        font-size: 0.9rem;
    }

    .bot-info-section {
        padding: 1rem;
        background: rgba(0, 136, 204, 0.1);
        border: 1px solid rgba(0, 136, 204, 0.2);
        border-radius: 10px;
    }

    .instructions {
        color: rgba(243, 243, 251, 0.85);
        font-size: 0.9rem;
    }

    .instructions ol {
        margin: 0;
        padding-left: 1.25rem;
    }

    .instructions li {
        margin: 0.4rem 0;
    }

    .instructions code {
        background: rgba(0, 0, 0, 0.3);
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.85em;
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
        border-color: #0088cc;
        background: rgba(26, 28, 45, 0.95);
    }

    .hint {
        font-size: 0.8rem;
        color: rgba(243, 243, 251, 0.5);
    }

    .hint a {
        color: #0088cc;
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

    .channel-config,
    .group-config {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .id-input-row {
        display: flex;
        gap: 0.5rem;
    }

    .id-input-row input {
        flex: 1;
    }

    .verify-button {
        padding: 0.5rem 1rem;
        background: #0088cc;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
        min-width: 70px;
    }

    .verify-button:hover:not(:disabled) {
        background: #006699;
    }

    .verify-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .status-success {
        color: #34d399;
        font-size: 0.85rem;
    }

    .status-error {
        color: #f87171;
        font-size: 0.85rem;
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
        background: linear-gradient(135deg, #0088cc, #006699);
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
