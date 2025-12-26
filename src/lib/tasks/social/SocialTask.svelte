<script lang="ts">
  import { onMount } from 'svelte';
  import type { TaskComponentProps } from "../TaskTypes";
  import {
    createDefaultSocialTaskConfig,
    type SocialTaskConfig,
    validateSocialTaskConfig
  } from "./schema";

  export let initialConfig: SocialTaskConfig | null = null;
  export let onSave: TaskComponentProps<SocialTaskConfig>["onSave"];
  export let onCancel: TaskComponentProps["onCancel"];

  let config: SocialTaskConfig = initialConfig
    ? structuredClone(initialConfig)
    : createDefaultSocialTaskConfig();

  let errors: string[] = [];

  // Discord bot setup state
  let discordSetup = {
    connected: false,
    guilds: [] as Array<{ id: string; name: string }>,
    selectedGuildId: '',
    selectedGuildName: '',
    botAdded: false,
    checking: false
  };

  // Telegram bot setup state
  let telegramSetup = {
    botUsername: '@YourBotUsername', // Replace with actual bot username from env
    botAdded: false,
    checking: false,
    channelId: ''
  };

  onMount(() => {
    checkDiscordConnection();
    loadBotUsername();

    // Listen for focus to check Discord connection when user returns from OAuth
    const handleFocus = () => {
      checkDiscordConnection();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  });

  async function loadBotUsername() {
    try {
      const response = await fetch('/api/config/telegram-bot');
      if (response.ok) {
        const data = await response.json();
        telegramSetup.botUsername = data.username || '@YourBotUsername';
      }
    } catch (err) {
      console.error('Failed to load bot username:', err);
    }
  }

  async function checkDiscordConnection() {
    try {
      const response = await fetch('/api/auth/discord/status');
      if (response.ok) {
        const data = await response.json();
        discordSetup.connected = data.connected;
        discordSetup.guilds = data.guilds || [];
      }
    } catch (err) {
      console.error('Failed to check Discord connection:', err);
    }
  }

  function connectDiscord() {
    const currentUrl = window.location.href;
    const authUrl = `/api/auth/discord/connect?returnTo=${encodeURIComponent(currentUrl)}`;
    
    // Mark that we're handling Discord OAuth to prevent parent form navigation
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('social_task_discord_oauth', '1');
    }

    // Try to open in new tab
    const authWindow = window.open(authUrl, '_blank', 'noopener,noreferrer');

    if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
      // Popup was blocked, fall back to same-tab navigation
      console.warn('Popup blocked, falling back to same-tab navigation');
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('social_task_discord_oauth');
      }
      window.location.href = authUrl;
    } else {
      // Successfully opened in new tab
      authWindow.focus();
      
      // Clear the flag after a short delay (user should be in the new tab by then)
      setTimeout(() => {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('social_task_discord_oauth');
        }
      }, 1000);
    }
  }

  function selectDiscordGuild(guildId: string, guildName: string) {
    discordSetup.selectedGuildId = guildId;
    discordSetup.selectedGuildName = guildName;
    discordSetup.botAdded = false;
    config = {
      ...config,
      discord: {
        ...config.discord,
        serverId: guildId,
        serverName: guildName
      }
    };
  }

  async function getDiscordBotInviteUrl(): Promise<string> {
    // Fetch the bot client ID from the backend
    const response = await fetch('/api/config/discord-bot');
    const data = await response.json();
    const botClientId = data.clientId || '';
    const permissions = '268437504'; // Read Members + Read Messages
    const guildId = discordSetup.selectedGuildId;
    
    // Pre-select the guild to make it easier for the creator
    return `https://discord.com/oauth2/authorize?client_id=${botClientId}&permissions=${permissions}&scope=bot${guildId ? `&guild_id=${guildId}` : ''}`;
  }

  async function addBotToServer() {
    if (!discordSetup.selectedGuildId) return;
    
    const inviteUrl = await getDiscordBotInviteUrl();
    window.open(inviteUrl, '_blank');
  }

  async function verifyDiscordBot() {
    if (!discordSetup.selectedGuildId) return;

    discordSetup.checking = true;
    try {
      const response = await fetch('/api/auth/discord/verify-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId: discordSetup.selectedGuildId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      discordSetup.botAdded = data.botInGuild;
      
      if (!data.botInGuild) {
        alert('Bot not found in server. Please make sure you added the bot and try again.');
      } else {
        alert('✓ Bot verified successfully!');
        config = {
          ...config,
          discord: {
            ...config.discord,
            serverId: discordSetup.selectedGuildId,
            serverName: discordSetup.selectedGuildName
          }
        };
      }
    } catch (err) {
      console.error('Failed to verify bot:', err);
      const errorMsg = err instanceof Error ? err.message : 'Please try again';
      if (errorMsg.includes('Unauthorized')) {
        alert('Please log in first to verify the bot.');
      } else {
        alert(`Failed to verify bot: ${errorMsg}`);
      }
    } finally {
      discordSetup.checking = false;
    }
  }

  async function verifyTelegramBot() {
    if (!telegramSetup.channelId) {
      alert('Please enter your channel/group ID or username');
      return;
    }

    telegramSetup.checking = true;
    try {
      const response = await fetch('/api/auth/telegram/verify-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: telegramSetup.channelId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      telegramSetup.botAdded = data.botInChat;
      
      if (!data.botInChat) {
        alert('Bot not found in channel/group. Please make sure you added the bot as admin and try again.');
      } else {
        alert('✓ Bot verified successfully!');
        config = {
          ...config,
          telegram: {
            ...config.telegram,
            channelId: telegramSetup.channelId
          }
        };
      }
    } catch (err) {
      console.error('Failed to verify bot:', err);
      const errorMsg = err instanceof Error ? err.message : 'Please try again';
      if (errorMsg.includes('Unauthorized')) {
        alert('Please log in first to verify the bot.');
      } else {
        alert(`Failed to verify bot: ${errorMsg}`);
      }
    } finally {
      telegramSetup.checking = false;
    }
  }

  $: discordSetupComplete = !config.discord.joinServer || (discordSetup.connected && discordSetup.selectedGuildId && discordSetup.botAdded);
  $: telegramSetupComplete = !(config.telegram.joinChannel || config.telegram.joinGroup) || telegramSetup.botAdded;
  $: canSave = discordSetupComplete && telegramSetupComplete;

  function handleSave() {
    errors = validateSocialTaskConfig(config);
    if (errors.length === 0) {
      onSave(structuredClone(config));
    }
  }

  function addTwitterPostLink() {
    config = {
      ...config,
      twitter: {
        ...config.twitter,
        postLinks: [...config.twitter.postLinks, ""]
      }
    };
  }

  function updateTwitterPostLink(value: string, index: number) {
    const posts = [...config.twitter.postLinks];
    posts[index] = value;
    config = {
      ...config,
      twitter: {
        ...config.twitter,
        postLinks: posts
      }
    };
  }

  function removeTwitterPostLink(index: number) {
    const posts = config.twitter.postLinks.filter((_, i) => i !== index);
    config = {
      ...config,
      twitter: {
        ...config.twitter,
        postLinks: posts.length ? posts : [""]
      }
    };
  }
</script>

<div class="task-panel">
  <div class="task-section">
    <h3>Telegram Tasks</h3>
    <div class="checkbox-grid">
      <label>
        <input type="checkbox" bind:checked={config.telegram.joinChannel} />
        Join channel
      </label>
      <label>
        <input type="checkbox" bind:checked={config.telegram.joinGroup} />
        Join group
      </label>
      <label>
        <input type="checkbox" bind:checked={config.telegram.reactPinned} />
        React to pinned message
      </label>
      <label>
        <input type="checkbox" bind:checked={config.telegram.shareUsername} />
        Share username
      </label>
    </div>

    <div class="grid-two">
      <div class="form-group">
        <label>Channel link</label>
        <input type="url" bind:value={config.telegram.channelLink} placeholder="https://t.me/yourchannel" />
      </div>
      <div class="form-group">
        <label>Group link</label>
        <input type="url" bind:value={config.telegram.groupLink} placeholder="https://t.me/yourgroup" />
      </div>
    </div>

    {#if config.telegram.shareUsername}
      <div class="form-group">
        <label>Username prompt</label>
        <input type="text" bind:value={config.telegram.usernamePrompt} placeholder="Enter your Telegram @" />
      </div>
    {/if}

    {#if config.telegram.joinChannel || config.telegram.joinGroup}
      <div class="bot-setup-box">
        <h4>🤖 Bot Setup Required</h4>
        <p class="setup-instruction">
          To verify participants, add our bot <strong>{telegramSetup.botUsername}</strong> to your channel/group as an admin.
        </p>
        <ol class="setup-steps">
          <li>Open your Telegram channel/group</li>
          <li>Go to Settings → Administrators</li>
          <li>Click "Add Administrator"</li>
          <li>Search for <strong>{telegramSetup.botUsername}</strong></li>
          <li>Add the bot with "View Members" permission</li>
        </ol>
        <div class="form-group">
          <label>Channel/Group ID or @username</label>
          <input 
            type="text" 
            bind:value={telegramSetup.channelId} 
            placeholder="@yourchannel or -1001234567890"
          />
          <small>Find your ID using @userinfobot in Telegram</small>
        </div>
        <button 
          type="button" 
          class="primary-btn"
          on:click={verifyTelegramBot}
          disabled={telegramSetup.checking || !telegramSetup.channelId}
        >
          {telegramSetup.checking ? 'Checking...' : telegramSetup.botAdded ? '✓ Bot Verified' : 'Verify Bot Added'}
        </button>
        {#if !telegramSetup.botAdded}
          <p class="warning-text">⚠️ You must verify the bot before saving this task</p>
        {/if}
      </div>
    {/if}
  </div>

  <div class="task-section">
    <h3>Discord Tasks</h3>
    <label class="checkbox-row">
      <input type="checkbox" bind:checked={config.discord.joinServer} />
      Join Discord server
    </label>

    {#if config.discord.joinServer}
      <div class="bot-setup-box">
        <h4>🤖 Bot Setup Required</h4>
        <p class="setup-instruction">
          To verify server membership, our bot needs to be added to your Discord server.
        </p>

        <!-- Step 1: Connect Discord -->
        <div class="setup-step" class:completed={discordSetup.connected}>
          <div class="step-header">
            <span class="step-number">1</span>
            <span>Connect Discord Account</span>
            {#if discordSetup.connected}<span class="check">✓</span>{/if}
          </div>
          {#if !discordSetup.connected}
            <button type="button" class="secondary-btn" on:click|stopPropagation={connectDiscord}>
              Connect Discord
            </button>
          {/if}
        </div>

        <!-- Step 2: Select Server -->
        {#if discordSetup.connected}
          <div class="setup-step" class:completed={discordSetup.selectedGuildId}>
            <div class="step-header">
              <span class="step-number">2</span>
              <span>Select Your Server</span>
              {#if discordSetup.selectedGuildId}<span class="check">✓</span>{/if}
            </div>
            {#if discordSetup.guilds.length > 0}
              <select 
                class="guild-select"
                on:change={(e) => {
                  const guild = discordSetup.guilds.find(g => g.id === e.currentTarget.value);
                  if (guild) selectDiscordGuild(guild.id, guild.name);
                }}
                value={discordSetup.selectedGuildId}
              >
                <option value="">Select a server...</option>
                {#each discordSetup.guilds as guild}
                  <option value={guild.id}>{guild.name}</option>
                {/each}
              </select>
            {:else}
              <p class="info-text">No servers found. Make sure you own or manage a Discord server.</p>
            {/if}
          </div>
        {/if}

        <!-- Step 3: Add Bot -->
        {#if discordSetup.selectedGuildId}
          <div class="setup-step" class:completed={discordSetup.botAdded}>
            <div class="step-header">
              <span class="step-number">3</span>
              <span>Add Bot to {discordSetup.selectedGuildName}</span>
              {#if discordSetup.botAdded}<span class="check">✓</span>{/if}
            </div>
            {#if !discordSetup.botAdded}
              <button
                type="button"
                on:click={addBotToServer}
                class="primary-btn"
              >
                Add Bot to Server
              </button>
              <p class="helper-text">After adding the bot, click verify below:</p>
              <button 
                type="button" 
                class="secondary-btn"
                on:click={verifyDiscordBot}
                disabled={discordSetup.checking}
              >
                {discordSetup.checking ? 'Checking...' : 'Verify Bot Added'}
              </button>
            {/if}
          </div>
        {/if}

        {#if !discordSetupComplete}
          <p class="warning-text">⚠️ Complete all steps before saving this task</p>
        {/if}
      </div>

      <div class="form-group">
        <label>Invite link (for participants)</label>
        <input type="url" bind:value={config.discord.inviteLink} placeholder="https://discord.gg/your-server" />
      </div>
    {/if}
  </div>

  <div class="task-section">
    <h3>X / Twitter Tasks</h3>
    <div class="checkbox-grid">
      <label><input type="checkbox" bind:checked={config.twitter.followAccount} /> Follow account</label>
      <label><input type="checkbox" bind:checked={config.twitter.likePost} /> Like post</label>
      <label><input type="checkbox" bind:checked={config.twitter.commentPost} /> Comment</label>
      <label><input type="checkbox" bind:checked={config.twitter.quotePost} /> Quote tweet</label>
      <label><input type="checkbox" bind:checked={config.twitter.retweetPost} /> Retweet</label>
      <label><input type="checkbox" bind:checked={config.twitter.bookmarkPost} /> Bookmark</label>
      <label><input type="checkbox" bind:checked={config.twitter.tagFriends} /> Tag 2 friends</label>
    </div>

    <div class="form-group">
      <label>Profile link</label>
      <input type="url" bind:value={config.twitter.profileLink} placeholder="https://x.com/yourprofile" />
    </div>

    <div class="form-group">
      <label>Post links</label>
      <div class="dynamic-list">
        {#each config.twitter.postLinks as link, index}
          <div class="dynamic-row">
            <input
              type="url"
              bind:value={config.twitter.postLinks[index]}
              on:input={(e) => updateTwitterPostLink((e.currentTarget as HTMLInputElement).value, index)}
              placeholder="https://x.com/yourprofile/status/123"
            />
            {#if config.twitter.postLinks.length > 1}
              <button type="button" class="ghost-btn" on:click={() => removeTwitterPostLink(index)}>Remove</button>
            {/if}
          </div>
        {/each}
      </div>
      <button type="button" class="ghost-btn" on:click={addTwitterPostLink}>+ Add post</button>
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
    <button 
      type="button" 
      class="primary-btn" 
      on:click={handleSave}
      disabled={!canSave}
    >
      Save Task
    </button>
  </div>
  
  {#if !canSave}
    <p class="save-blocked-message">
      Complete bot setup for Discord/Telegram tasks before saving
    </p>
  {/if}
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
    font-size: 1.05rem;
  }

  .checkbox-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.65rem 1rem;
  }

  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
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

  input {
    background: rgba(26, 28, 45, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 0.6rem 0.75rem;
    color: #f4f4fb;
  }

  input:focus {
    outline: none;
    border-color: #5b8dff;
  }

  .dynamic-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .dynamic-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.75rem;
    align-items: center;
  }

  .ghost-btn {
    padding: 0.45rem 0.8rem;
    background: rgba(91, 141, 255, 0.12);
    color: #8aa8ff;
    border: 1px solid rgba(91, 141, 255, 0.2);
    border-radius: 8px;
    cursor: pointer;
  }

  .ghost-btn:hover {
    opacity: 0.85;
  }

  .primary-btn {
    padding: 0.6rem 1.2rem;
    background: linear-gradient(135deg, #5b8dff, #9f75ff);
    color: #fff;
    border: none;
    border-radius: 10px;
    cursor: pointer;
  }

  .primary-btn:hover {
    opacity: 0.92;
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

  /* Bot Setup Styles */
  .bot-setup-box {
    background: rgba(88, 101, 242, 0.05);
    border: 2px solid rgba(88, 101, 242, 0.2);
    border-radius: 10px;
    padding: 1.5rem;
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .bot-setup-box h4 {
    margin: 0;
    font-size: 1.1rem;
    color: #f2f3ff;
  }

  .setup-instruction {
    color: rgba(242, 243, 255, 0.8);
    margin: 0;
    font-size: 0.95rem;
  }

  .setup-steps {
    margin: 0;
    padding-left: 1.5rem;
    color: rgba(242, 243, 255, 0.7);
    font-size: 0.9rem;
  }

  .setup-steps li {
    margin: 0.5rem 0;
  }

  .setup-step {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 1rem;
    transition: border-color 0.3s ease;
  }

  .setup-step.completed {
    border-color: rgba(40, 167, 69, 0.4);
    background: rgba(40, 167, 69, 0.05);
  }

  .step-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    font-weight: 600;
  }

  .step-number {
    background: rgba(88, 101, 242, 0.2);
    color: #5865f2;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .setup-step.completed .step-number {
    background: rgba(40, 167, 69, 0.2);
    color: #28a745;
  }

  .check {
    color: #28a745;
    font-size: 1.2rem;
    margin-left: auto;
  }

  .guild-select {
    width: 100%;
    padding: 0.6rem 0.75rem;
    background: rgba(26, 28, 45, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    color: #f4f4fb;
    font-size: 0.95rem;
  }

  .guild-select option {
    background: #1a1c2d;
  }

  .secondary-btn {
    padding: 0.5rem 1rem;
    background: rgba(91, 141, 255, 0.15);
    color: #8aa8ff;
    border: 1px solid rgba(91, 141, 255, 0.3);
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .secondary-btn:hover:not(:disabled) {
    background: rgba(91, 141, 255, 0.2);
  }

  .secondary-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .helper-text {
    color: rgba(242, 243, 255, 0.5);
    font-size: 0.85rem;
    margin: 0;
  }

  .info-text {
    color: rgba(242, 243, 255, 0.7);
    font-size: 0.9rem;
    margin: 0;
  }

  .warning-text {
    color: #ffc107;
    font-weight: 600;
    font-size: 0.9rem;
    margin: 0;
  }

  .save-blocked-message {
    color: #ff6b6b;
    text-align: center;
    margin: 0.5rem 0 0;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .primary-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  small {
    color: rgba(242, 243, 255, 0.5);
    font-size: 0.8rem;
  }
</style>
