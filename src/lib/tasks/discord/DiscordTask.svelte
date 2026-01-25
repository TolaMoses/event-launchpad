<script lang="ts">
    import { onMount } from "svelte";
    import type { TaskComponentProps } from "../TaskTypes";

    interface DiscordGuild {
        id: string;
        name: string;
        icon: string | null;
    }

    interface DiscordTaskConfig {
        title: string;
        description: string;
        discord: {
            joinServer: boolean;
            inviteLink: string;
            serverId: string;
            serverName: string;
        };
    }

    export let initialConfig: DiscordTaskConfig | null = null;
    export let onSave: TaskComponentProps<DiscordTaskConfig>["onSave"];
    export let onCancel: TaskComponentProps["onCancel"];

    let config: DiscordTaskConfig = initialConfig
        ? structuredClone(initialConfig)
        : {
              title: "Join Discord Server",
              description: "Join our Discord community",
              discord: {
                  joinServer: true,
                  inviteLink: "",
                  serverId: "",
                  serverName: "",
              },
          };

    let errors: string[] = [];

    // Discord connection state
    let discordConnected = false;
    let discordUsername = "";
    let guilds: DiscordGuild[] = [];
    let loadingGuilds = true;
    let loadingError = "";

    // Bot status for selected server
    let botStatus: "unknown" | "checking" | "in-server" | "not-in-server" =
        "unknown";
    let botClientId = "";

    onMount(async () => {
        await loadDiscordStatus();
        await loadBotClientId();
    });

    async function loadDiscordStatus() {
        loadingGuilds = true;
        loadingError = "";

        try {
            const response = await fetch("/api/auth/discord/guilds");
            const data = await response.json();

            discordConnected = data.connected;
            discordUsername = data.username || "";
            guilds = data.guilds || [];
            loadingError = data.error || "";

            // If we have an existing serverId, check bot status
            if (config.discord.serverId && discordConnected) {
                await checkBotStatus(config.discord.serverId);
            }
        } catch (err) {
            console.error("Failed to load Discord status:", err);
            loadingError = "Failed to load Discord connection status";
        } finally {
            loadingGuilds = false;
        }
    }

    async function loadBotClientId() {
        try {
            const response = await fetch("/api/config/discord-bot");
            const data = await response.json();
            botClientId = data.clientId || "";
        } catch (err) {
            console.error("Failed to load bot client ID:", err);
        }
    }

    async function checkBotStatus(guildId: string) {
        if (!guildId) return;

        botStatus = "checking";

        try {
            const response = await fetch("/api/auth/discord/verify-bot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guildId }),
            });

            const data = await response.json();
            botStatus = data.botInGuild ? "in-server" : "not-in-server";
        } catch (err) {
            console.error("Failed to check bot status:", err);
            botStatus = "unknown";
        }
    }

    function handleServerSelect(event: Event) {
        const select = event.target as HTMLSelectElement;
        const selectedGuild = guilds.find((g) => g.id === select.value);

        if (selectedGuild) {
            config.discord.serverId = selectedGuild.id;
            config.discord.serverName = selectedGuild.name;
            checkBotStatus(selectedGuild.id);
        } else {
            config.discord.serverId = "";
            config.discord.serverName = "";
            botStatus = "unknown";
        }
    }

    function getBotInviteUrl(guildId: string): string {
        if (!botClientId || !guildId) return "";

        // Bot invite URL with required permissions
        const permissions = "1024"; // VIEW_CHANNEL permission - minimal for verification
        return `https://discord.com/api/oauth2/authorize?client_id=${botClientId}&permissions=${permissions}&scope=bot&guild_id=${guildId}`;
    }

    function connectDiscord() {
        // Open Discord OAuth in new tab
        const authUrl = `/api/auth/discord/connect?returnTo=${encodeURIComponent(window.location.pathname)}`;
        const authWindow = window.open(
            authUrl,
            "_blank",
            "width=600,height=700",
        );

        // Poll to check if connection is complete
        const pollInterval = setInterval(async () => {
            try {
                // Check if window was closed
                if (authWindow?.closed) {
                    clearInterval(pollInterval);
                    // Refresh Discord status
                    await loadDiscordStatus();
                    return;
                }

                // Check connection status
                const response = await fetch("/api/auth/discord/guilds");
                const data = await response.json();

                if (data.connected) {
                    clearInterval(pollInterval);
                    // Close the auth window if still open
                    authWindow?.close();
                    // Refresh Discord status
                    await loadDiscordStatus();
                }
            } catch (err) {
                // Continue polling
            }
        }, 1500); // Poll every 1.5 seconds

        // Stop polling after 5 minutes (safety timeout)
        setTimeout(
            () => {
                clearInterval(pollInterval);
            },
            5 * 60 * 1000,
        );
    }

    function handleSave() {
        errors = [];

        if (!config.title.trim()) {
            errors.push("Task title is required");
        }

        if (!config.discord.serverId) {
            errors.push("Please select a Discord server");
        }

        if (botStatus === "not-in-server") {
            errors.push("Please add the bot to your server before saving");
        }

        // Require invite link for participants
        if (!config.discord.inviteLink.trim()) {
            errors.push("Discord invite link is required");
        } else if (!isValidDiscordInvite(config.discord.inviteLink)) {
            errors.push(
                "Invalid Discord invite link format (e.g., https://discord.gg/xxxxx)",
            );
        }

        if (errors.length === 0) {
            onSave(structuredClone(config));
        }
    }

    function isValidDiscordInvite(url: string): boolean {
        return /^https?:\/\/(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9-]+$/.test(
            url,
        );
    }
</script>

<div class="task-panel">
    <h3>Discord Task</h3>
    <p class="description">
        Configure a Discord server join task. Participants will need to connect
        their Discord account and join your server.
    </p>

    <!-- Discord Connection Status -->
    <div class="connection-section">
        {#if loadingGuilds}
            <div class="loading-state">
                <span class="loading-spinner"></span>
                Loading Discord connection...
            </div>
        {:else if discordConnected}
            <div class="connected-status">
                <span class="status-icon">✓</span>
                <span>Connected as <strong>{discordUsername}</strong></span>
            </div>
        {:else}
            <div class="connect-prompt">
                <p class="connect-message">
                    Connect your Discord to select a server for verification
                </p>
                <button
                    type="button"
                    class="connect-button"
                    on:click={connectDiscord}
                >
                    Connect Discord
                </button>
                {#if loadingError}
                    <p class="error-hint">{loadingError}</p>
                {/if}
            </div>
        {/if}
    </div>

    {#if discordConnected}
        <!-- Server Selection -->
        <div class="form-group">
            <label for="server-select">Select Server *</label>
            <select
                id="server-select"
                value={config.discord.serverId}
                on:change={handleServerSelect}
            >
                <option value="">-- Select a server --</option>
                {#each guilds as guild}
                    <option value={guild.id}>{guild.name}</option>
                {/each}
            </select>
            <span class="hint"
                >Only servers where you have admin permissions are shown</span
            >
        </div>

        {#if config.discord.serverId}
            <!-- Bot Status -->
            <div class="bot-status-section">
                <label>Verification Bot Status</label>
                <div class="bot-status">
                    {#if botStatus === "checking"}
                        <span class="status-checking">Checking...</span>
                    {:else if botStatus === "in-server"}
                        <span class="status-success">✓ Bot is in server</span>
                    {:else if botStatus === "not-in-server"}
                        <div class="bot-setup">
                            <span class="status-warning">Bot not in server</span
                            >
                            <a
                                href={getBotInviteUrl(config.discord.serverId)}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="add-bot-button"
                            >
                                Add Bot to Server
                            </a>
                            <button
                                type="button"
                                class="refresh-button"
                                on:click={() =>
                                    checkBotStatus(config.discord.serverId)}
                            >
                                ↻ Refresh
                            </button>
                        </div>
                    {:else}
                        <span class="status-unknown">Unable to verify</span>
                    {/if}
                </div>
            </div>
        {/if}

        <div class="form-group">
            <label for="task-title">Task Title</label>
            <input
                id="task-title"
                type="text"
                bind:value={config.title}
                placeholder="Join our Discord server"
            />
        </div>

        <div class="form-group">
            <label for="description">Description</label>
            <textarea
                id="description"
                rows="3"
                bind:value={config.description}
                placeholder="Join our Discord community to stay updated and connect with others"
            ></textarea>
        </div>

        <div class="form-group">
            <label for="invite-link">Discord Invite Link *</label>
            <input
                id="invite-link"
                type="url"
                bind:value={config.discord.inviteLink}
                placeholder="https://discord.gg/your-invite-code"
            />
            <span class="hint"
                >Participants will use this link to join your server</span
            >
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
        <button
            type="button"
            class="primary-btn"
            on:click={handleSave}
            disabled={!discordConnected}
        >
            Save Task
        </button>
    </div>
</div>

<style>
    .task-panel {
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

    .connection-section {
        padding: 1rem;
        background: rgba(88, 101, 242, 0.1);
        border: 1px solid rgba(88, 101, 242, 0.2);
        border-radius: 10px;
    }

    .loading-state {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: rgba(243, 243, 251, 0.7);
    }

    .loading-spinner {
        width: 18px;
        height: 18px;
        border: 2px solid rgba(88, 101, 242, 0.3);
        border-top-color: #5865f2;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .connected-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #34d399;
    }

    .status-icon {
        font-size: 1.25rem;
    }

    .connect-prompt {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        align-items: flex-start;
    }

    .connect-message {
        margin: 0;
        color: rgba(243, 243, 251, 0.8);
        font-size: 0.9rem;
    }

    .connect-button {
        padding: 0.65rem 1.25rem;
        background: #5865f2;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
    }

    .connect-button:hover {
        background: #4752c4;
    }

    .error-hint {
        margin: 0;
        color: #f87171;
        font-size: 0.8rem;
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

    select {
        cursor: pointer;
    }

    input:focus,
    textarea:focus,
    select:focus {
        outline: none;
        border-color: #5865f2;
        background: rgba(26, 28, 45, 0.95);
    }

    .hint {
        font-size: 0.8rem;
        color: rgba(243, 243, 251, 0.5);
    }

    .bot-status-section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .bot-status {
        padding: 0.75rem;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
    }

    .status-checking {
        color: rgba(243, 243, 251, 0.6);
    }

    .status-success {
        color: #34d399;
        font-weight: 500;
    }

    .status-warning {
        color: #fbbf24;
    }

    .status-unknown {
        color: rgba(243, 243, 251, 0.5);
    }

    .bot-setup {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
    }

    .add-bot-button {
        padding: 0.5rem 1rem;
        background: #5865f2;
        color: #fff;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 500;
        font-size: 0.85rem;
        transition: background 0.2s;
    }

    .add-bot-button:hover {
        background: #4752c4;
    }

    .refresh-button {
        padding: 0.4rem 0.75rem;
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: rgba(243, 243, 251, 0.8);
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.2s;
    }

    .refresh-button:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.3);
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
        background: linear-gradient(135deg, #5865f2, #7289da);
        color: #fff;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 600;
        transition:
            opacity 0.2s ease,
            transform 0.2s ease;
    }

    .primary-btn:hover:not(:disabled) {
        opacity: 0.93;
        transform: translateY(-1px);
    }

    .primary-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
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
