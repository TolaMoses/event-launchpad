<script lang="ts">
  import { onMount } from 'svelte';

  onMount(() => {
    // Try to close the tab after a short delay
    setTimeout(() => {
      window.close();
    }, 2000);
  });
</script>

<div class="success-container">
  <div class="success-card">
    <div class="success-icon">✓</div>
    <h1>Connection Successful!</h1>
    <p>Your Discord account has been connected successfully.</p>
    <p class="instruction">You may close this tab and return to the event creation page.</p>
    <button type="button" class="primary-btn" on:click={() => window.close()}>
      Close Tab
    </button>
  </div>
</div>

<style>
  .success-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem;
  }

  .success-card {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    padding: 3rem 2rem;
    max-width: 500px;
    width: 100%;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .success-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    color: white;
    animation: scaleIn 0.5s ease-out;
  }

  @keyframes scaleIn {
    from {
      transform: scale(0);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 1rem;
  }

  p {
    font-size: 1.1rem;
    color: #666;
    margin-bottom: 1rem;
    line-height: 1.6;
  }

  .instruction {
    font-size: 0.95rem;
    color: #888;
    margin-bottom: 2rem;
  }

  .primary-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 0.875rem 2rem;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .primary-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
  }

  .primary-btn:active {
    transform: translateY(0);
  }
</style>
