<script lang="ts">
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
  </div>

  <div class="task-section">
    <h3>Discord Tasks</h3>
    <label class="checkbox-row">
      <input type="checkbox" bind:checked={config.discord.joinServer} />
      Join Discord server
    </label>
    <div class="form-group">
      <label>Invite link</label>
      <input type="url" bind:value={config.discord.inviteLink} placeholder="https://discord.gg/your-server" />
    </div>
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
    <button type="button" class="primary-btn" on:click={handleSave}>Save Task</button>
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
</style>
