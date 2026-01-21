<script lang="ts">
  import type { EventType } from '$lib/shared/types/event-creation.types';
  import { EVENT_TYPE_LABELS } from '$lib/config/event-creation.config';

  export let selectedType: EventType = '';
  export let onSelect: (type: EventType) => void = () => {};
</script>

<div class="event-type-selector">
  <h1>Create Your Event</h1>
  <p class="subtitle">Choose your event type to get started</p>

  <div class="type-cards">
    <!-- Quick Event -->
    <button
      class="type-card"
      class:selected={selectedType === 'quick_event'}
      on:click={() => onSelect('quick_event')}
    >
      <div class="icon">⚡</div>
      <h3>Quick Event</h3>
      <p>Perfect for time-limited campaigns, contests, and promotional events</p>
      <ul>
        <li>Token or NFT rewards</li>
        <li>Winner selection</li>
        <li>Task-based participation</li>
        <li>Leaderboard rankings</li>
      </ul>
    </button>

    <!-- Community Event -->
    <button
      class="type-card"
      class:selected={selectedType === 'community'}
      on:click={() => onSelect('community')}
    >
      <div class="icon">🌟</div>
      <h3>Community Event</h3>
      <p>Build long-term engagement with point-based reward systems</p>
      <ul>
        <li>Custom point system</li>
        <li>Continuous participation</li>
        <li>Leaderboard tracking</li>
        <li>Role-based rewards</li>
      </ul>
    </button>
  </div>
</div>

<style>
  .event-type-selector {
    text-align: center;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    color: #fff;
  }

  .subtitle {
    font-size: 1.1rem;
    color: #888;
    margin-bottom: 3rem;
  }

  .type-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
  }

  .type-card {
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 2rem;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: left;
  }

  .type-card:hover {
    border-color: rgba(139, 92, 246, 0.5);
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.2);
  }

  .type-card.selected {
    border-color: #8b5cf6;
    background: rgba(139, 92, 246, 0.1);
  }

  .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .type-card h3 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: #fff;
  }

  .type-card p {
    color: #888;
    margin-bottom: 1rem;
    line-height: 1.5;
  }

  .type-card ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .type-card li {
    padding: 0.5rem 0;
    color: #aaa;
    display: flex;
    align-items: center;
  }

  .type-card li::before {
    content: '✓';
    color: #8b5cf6;
    font-weight: bold;
    margin-right: 0.5rem;
  }

  .type-card.selected li::before {
    color: #a78bfa;
  }
</style>
