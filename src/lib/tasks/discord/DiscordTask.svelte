<script lang="ts">
  import type { TaskComponentProps } from "../TaskTypes";

  interface DiscordTaskConfig {
    title: string;
    description: string;
    points: number;
    discord: {
      joinServer: boolean;
      inviteLink: string;
      serverId?: string;
      serverName?: string;
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
        points: 10,
        discord: {
          joinServer: true,
          inviteLink: "",
          serverName: ""
        }
      };

  let errors: string[] = [];

  function handleSave() {
    errors = [];

    if (!config.title.trim()) {
      errors.push("Task title is required");
    }

    if (!config.discord.inviteLink.trim()) {
      errors.push("Discord invite link is required");
    } else if (!isValidDiscordInvite(config.discord.inviteLink)) {
      errors.push("Invalid Discord invite link format (e.g., https://discord.gg/xxxxx)");
    }

    if (errors.length === 0) {
      onSave(structuredClone(config));
    }
  }

  function isValidDiscordInvite(url: string): boolean {
    return /^https?:\/\/(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9-]+$/.test(url);
  }
</script>

<div class="task-panel">
  <h3>Discord Task</h3>
  <p class="description">
    Configure a Discord server join task. Participants will need to connect their Discord account
    and join your server.
  </p>

  <div class="form-group">
    <label>Task Title</label>
    <input type="text" bind:value={config.title} placeholder="Join our Discord server" />
  </div>

  <div class="form-group">
    <label>Description</label>
    <textarea
      rows="3"
      bind:value={config.description}
      placeholder="Join our Discord community to stay updated and connect with others"
    ></textarea>
  </div>

  <div class="form-group">
    <label>Discord Invite Link *</label>
    <input
      type="url"
      bind:value={config.discord.inviteLink}
      placeholder="https://discord.gg/your-invite-code"
    />
    <span class="hint">Enter your Discord server invite link</span>
  </div>

  <div class="form-group">
    <label>Server Name (Optional)</label>
    <input
      type="text"
      bind:value={config.discord.serverName}
      placeholder="My Awesome Community"
    />
    <span class="hint">Display name for your Discord server</span>
  </div>

  <div class="form-group">
    <label>Points</label>
    <input type="number" min="0" bind:value={config.points} placeholder="10" />
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
    <button type="button" class="primary-btn" on:click={handleSave}>Save Task</button>
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
    border-color: #5865f2;
    background: rgba(26, 28, 45, 0.95);
  }

  .hint {
    font-size: 0.8rem;
    color: rgba(243, 243, 251, 0.5);
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
    transition: opacity 0.2s ease, transform 0.2s ease;
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
