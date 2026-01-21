<script lang="ts">
  import { getTaskLabel, summariseTask } from '$lib/utils/event-creation.utils';
  import type { TaskInstance } from '$lib/tasks/TaskTypes';
  import type { RewardConfig } from '$lib/shared/types/event-creation.types';

  export let title: string = '';
  export let description: string = '';
  export let startISO: string = '';
  export let endISO: string = '';
  export let tasks: TaskInstance[] = [];
  export let rewards: RewardConfig[] = [];
  export let bannerPreview: string = '';
  export let logoPreview: string = '';
  export let videoUrl: string = '';
  export let numWinners: string = '';

  $: startDate = startISO ? new Date(startISO) : null;
  $: endDate = endISO ? new Date(endISO) : null;
  $: totalPoints = tasks.reduce((sum, task) => sum + (task.points || 0), 0);

  function formatDate(date: Date | null): string {
    if (!date) return 'Not set';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getRewardTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      Token: 'Token Rewards',
      ETH: 'Native Coin Rewards',
      NFT: 'NFT Rewards',
      MintableNFT: 'Mintable NFT',
      Gift: 'Physical Gift',
      Voucher: 'Digital Voucher',
      CustomPoints: 'Custom Points'
    };
    return labels[type] || type;
  }
</script>

<div class="event-preview">
  <h2>Event Preview</h2>
  <p class="preview-hint">Review your event before publishing</p>

  <!-- Banner & Logo -->
  <div class="visual-preview">
    {#if bannerPreview}
      <div class="banner-preview">
        <img src={bannerPreview} alt="Event banner" />
      </div>
    {/if}
    
    {#if logoPreview}
      <div class="logo-preview">
        <img src={logoPreview} alt="Event logo" />
      </div>
    {/if}
  </div>

  <!-- Basic Info -->
  <div class="preview-section">
    <h3>{title || 'Untitled Event'}</h3>
    <p class="description">{description || 'No description provided'}</p>
    
    {#if videoUrl}
      <div class="video-info">
        <span class="icon">🎥</span>
        <span>Video URL: {videoUrl}</span>
      </div>
    {/if}
  </div>

  <!-- Schedule -->
  <div class="preview-section">
    <h4>Schedule</h4>
    <div class="schedule-info">
      <div class="schedule-item">
        <span class="label">Start:</span>
        <span class="value">{formatDate(startDate)}</span>
      </div>
      <div class="schedule-item">
        <span class="label">End:</span>
        <span class="value">{formatDate(endDate)}</span>
      </div>
    </div>
  </div>

  <!-- Tasks -->
  <div class="preview-section">
    <h4>Tasks ({tasks.length})</h4>
    {#if tasks.length > 0}
      <div class="stats">
        <span class="stat-item">Total Points: <strong>{totalPoints}</strong></span>
      </div>
      <ul class="task-preview-list">
        {#each tasks as task, index}
          <li>
            <span class="task-number">{index + 1}</span>
            <div class="task-info">
              <div class="task-header-preview">
                <span class="task-type-badge">{getTaskLabel(task.type)}</span>
                <span class="task-points-preview">{task.points} pts</span>
              </div>
              <strong>{task.title}</strong>
              <p class="task-summary-preview">{summariseTask(task)}</p>
            </div>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty">No tasks added</p>
    {/if}
  </div>

  <!-- Rewards -->
  <div class="preview-section">
    <h4>Rewards ({rewards.length})</h4>
    {#if numWinners}
      <p class="winners-info">🏆 {numWinners} winner{Number(numWinners) !== 1 ? 's' : ''}</p>
    {/if}
    
    {#if rewards.length > 0}
      <ul class="reward-preview-list">
        {#each rewards as reward}
          <li>
            <span class="reward-type">{getRewardTypeLabel(reward.type)}</span>
            {#if reward.prizePool}
              <span class="reward-amount">{reward.prizePool} {reward.customTokenSymbol || 'tokens'}</span>
            {/if}
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty">No rewards configured</p>
    {/if}
  </div>
</div>

<style>
  .event-preview {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
  }

  h2 {
    color: #fff;
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }

  .preview-hint {
    color: #888;
    margin-bottom: 2rem;
  }

  .visual-preview {
    margin-bottom: 2rem;
  }

  .banner-preview {
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 1rem;
  }

  .banner-preview img {
    width: 100%;
    max-height: 300px;
    object-fit: cover;
    display: block;
  }

  .logo-preview {
    display: flex;
    justify-content: center;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 12px;
  }

  .logo-preview img {
    max-width: 150px;
    max-height: 150px;
    object-fit: contain;
  }

  .preview-section {
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .preview-section h3 {
    color: #fff;
    font-size: 1.75rem;
    margin-bottom: 1rem;
  }

  .preview-section h4 {
    color: #fff;
    font-size: 1.125rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .description {
    color: #aaa;
    line-height: 1.6;
    margin-bottom: 1rem;
  }

  .video-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #8b5cf6;
    font-size: 0.875rem;
  }

  .schedule-info {
    display: grid;
    gap: 0.75rem;
  }

  .schedule-item {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
  }

  .label {
    color: #888;
    font-weight: 500;
  }

  .value {
    color: #fff;
  }

  .stats {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: rgba(139, 92, 246, 0.1);
    border-radius: 6px;
  }

  .stat-item {
    color: #aaa;
  }

  .stat-item strong {
    color: #8b5cf6;
    font-size: 1.125rem;
  }

  .task-preview-list,
  .reward-preview-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .task-preview-list li {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
  }

  .task-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: rgba(139, 92, 246, 0.2);
    color: #8b5cf6;
    border-radius: 50%;
    font-weight: 600;
    flex-shrink: 0;
  }

  .task-info {
    flex: 1;
  }

  .task-header-preview {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .task-type-badge {
    padding: 0.25rem 0.5rem;
    background: rgba(139, 92, 246, 0.2);
    color: #a78bfa;
    font-size: 0.75rem;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .task-points-preview {
    color: #10b981;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .task-info strong {
    color: #fff;
    display: block;
    margin-bottom: 0.25rem;
  }

  .task-summary-preview {
    color: #888;
    font-size: 0.875rem;
    margin: 0;
  }

  .reward-preview-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
  }

  .reward-type {
    color: #fff;
    font-weight: 500;
  }

  .reward-amount {
    color: #10b981;
    font-weight: 600;
  }

  .winners-info {
    color: #8b5cf6;
    font-weight: 500;
    margin-bottom: 1rem;
  }

  .empty {
    color: #666;
    font-style: italic;
    text-align: center;
    padding: 1rem;
  }
</style>
