<script lang="ts">
  export let isValid: boolean = false;
  export let isSubmitting: boolean = false;
  export let validationErrors: string[] = [];
  export let onSubmit: () => Promise<void> = async () => {};
  export let buttonText: string = 'Create Event';

  async function handleSubmit() {
    if (!isValid || isSubmitting) return;
    await onSubmit();
  }
</script>

<div class="submit-section">
  {#if validationErrors.length > 0}
    <div class="validation-errors">
      <div class="error-header">
        <span class="error-icon">⚠️</span>
        <strong>Please fix the following issues:</strong>
      </div>
      <ul>
        {#each validationErrors as error}
          <li>{error}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <button
    type="button"
    class="submit-button"
    class:valid={isValid}
    class:submitting={isSubmitting}
    disabled={!isValid || isSubmitting}
    on:click={handleSubmit}
  >
    {#if isSubmitting}
      <span class="spinner"></span>
      <span>Creating Event...</span>
    {:else}
      <span class="button-icon">🚀</span>
      <span>{buttonText}</span>
    {/if}
  </button>

  {#if !isValid && validationErrors.length === 0}
    <p class="hint">Complete all required fields to create your event</p>
  {/if}
</div>

<style>
  .submit-section {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 2px solid rgba(255, 255, 255, 0.1);
  }

  .validation-errors {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .error-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: #ef4444;
    margin-bottom: 1rem;
    font-size: 1rem;
  }

  .error-icon {
    font-size: 1.5rem;
  }

  .validation-errors ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .validation-errors li {
    color: #fca5a5;
    padding: 0.5rem 0;
    padding-left: 1.5rem;
    position: relative;
  }

  .validation-errors li::before {
    content: '•';
    position: absolute;
    left: 0.5rem;
    color: #ef4444;
    font-weight: bold;
  }

  .submit-button {
    width: 100%;
    padding: 1.25rem 2rem;
    background: rgba(139, 92, 246, 0.2);
    border: 2px solid rgba(139, 92, 246, 0.3);
    border-radius: 12px;
    color: #8b5cf6;
    font-size: 1.125rem;
    font-weight: 600;
    cursor: not-allowed;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    opacity: 0.6;
  }

  .submit-button.valid {
    background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
    border-color: #8b5cf6;
    color: #fff;
    cursor: pointer;
    opacity: 1;
  }

  .submit-button.valid:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.4);
  }

  .submit-button.submitting {
    cursor: wait;
    opacity: 0.8;
  }

  .submit-button:disabled {
    cursor: not-allowed;
  }

  .button-icon {
    font-size: 1.5rem;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .hint {
    text-align: center;
    color: #888;
    font-size: 0.875rem;
    margin-top: 1rem;
  }

  @media (max-width: 640px) {
    .submit-button {
      font-size: 1rem;
      padding: 1rem 1.5rem;
    }
  }
</style>
