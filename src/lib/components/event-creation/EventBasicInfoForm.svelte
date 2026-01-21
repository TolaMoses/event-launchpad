<script lang="ts">
  export let title: string = '';
  export let description: string = '';
  export let videoUrl: string = '';
  export let numWinners: string = '';
  export let showWinners: boolean = true;

  // Character limits
  const TITLE_MIN = 3;
  const TITLE_MAX = 100;
  const DESC_MIN = 10;
  const DESC_MAX = 1000;

  // Validation
  $: titleValid = title.length >= TITLE_MIN && title.length <= TITLE_MAX;
  $: descValid = description.length >= DESC_MIN && description.length <= DESC_MAX;
</script>

<div class="basic-info-form">
  <h2>Event Details</h2>

  <!-- Event Title -->
  <div class="form-group">
    <label for="event-title">
      Event Title *
      <span class="char-count" class:warn={title.length > TITLE_MAX * 0.9}>
        {title.length}/{TITLE_MAX}
      </span>
    </label>
    <input
      id="event-title"
      type="text"
      bind:value={title}
      placeholder="Enter event title (e.g., 'Spring Token Giveaway')"
      maxlength={TITLE_MAX}
      class:invalid={title && !titleValid}
    />
    {#if title && !titleValid}
      <p class="error-hint">
        Title must be between {TITLE_MIN} and {TITLE_MAX} characters
      </p>
    {/if}
  </div>

  <!-- Event Description -->
  <div class="form-group">
    <label for="event-description">
      Event Description *
      <span class="char-count" class:warn={description.length > DESC_MAX * 0.9}>
        {description.length}/{DESC_MAX}
      </span>
    </label>
    <textarea
      id="event-description"
      bind:value={description}
      placeholder="Describe your event, its purpose, and what participants can expect..."
      rows="6"
      maxlength={DESC_MAX}
      class:invalid={description && !descValid}
    />
    {#if description && !descValid}
      <p class="error-hint">
        Description must be between {DESC_MIN} and {DESC_MAX} characters
      </p>
    {/if}
  </div>

  <!-- Video URL (Optional) -->
  <div class="form-group">
    <label for="video-url">
      Video URL (Optional)
      <span class="hint-text">YouTube, Vimeo, or direct video link</span>
    </label>
    <input
      id="video-url"
      type="url"
      bind:value={videoUrl}
      placeholder="https://youtube.com/watch?v=..."
    />
  </div>

  <!-- Number of Winners (if applicable) -->
  {#if showWinners}
    <div class="form-group">
      <label for="num-winners">
        Number of Winners *
        <span class="hint-text">How many participants will receive rewards</span>
      </label>
      <input
        id="num-winners"
        type="number"
        bind:value={numWinners}
        placeholder="e.g., 10"
        min="1"
        max="10000"
      />
    </div>
  {/if}
</div>

<style>
  .basic-info-form {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
  }

  h2 {
    color: #fff;
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #fff;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .char-count {
    font-size: 0.875rem;
    color: #888;
    font-weight: normal;
  }

  .char-count.warn {
    color: #fbbf24;
  }

  .hint-text {
    font-size: 0.875rem;
    color: #888;
    font-weight: normal;
  }

  input,
  textarea {
    width: 100%;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #fff;
    font-family: inherit;
    font-size: 1rem;
    transition: all 0.3s ease;
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: #8b5cf6;
    background: rgba(255, 255, 255, 0.08);
  }

  input.invalid,
  textarea.invalid {
    border-color: #ef4444;
  }

  textarea {
    resize: vertical;
    min-height: 120px;
  }

  input[type='number'] {
    max-width: 200px;
  }

  .error-hint {
    color: #ef4444;
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }

  input::placeholder,
  textarea::placeholder {
    color: #666;
  }
</style>
