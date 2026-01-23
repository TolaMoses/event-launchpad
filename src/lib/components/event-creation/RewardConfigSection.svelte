<script lang="ts">
  import RewardBuilder from "$lib/components/RewardBuilder.svelte";
  import type {
    RewardConfig,
    PrizeOption,
  } from "$lib/shared/types/event-creation.types";
  import { PRIZE_OPTIONS } from "$lib/config/event-creation.config";
  import { generateId } from "$lib/utils/event-creation.utils";

  export let rewards: RewardConfig[] = [];
  export let numWinners: string = "";
  export let chainId: string = "";
  export let onUpdate: (rewards: RewardConfig[]) => void = () => {};

  let selectedRewardType = "";

  // All prize options are now available for all events
  const prizeOptions = PRIZE_OPTIONS;

  $: hasCustomPoints = rewards.some((r) => r.type === "CustomPoints");

  function addReward() {
    if (!selectedRewardType) return;

    const newReward: RewardConfig = {
      id: generateId(),
      type: selectedRewardType,
    };

    rewards = [...rewards, newReward];
    selectedRewardType = "";
    onUpdate(rewards);
  }

  function removeReward(id: string) {
    if (confirm("Are you sure you want to remove this reward?")) {
      rewards = rewards.filter((r) => r.id !== id);
      onUpdate(rewards);
    }
  }

  function handleRewardUpdate(id: string, updated: RewardConfig) {
    rewards = rewards.map((r) => (r.id === id ? updated : r));
    onUpdate(rewards);
  }

  function getRewardLabel(reward: RewardConfig): string {
    const labels: Record<string, string> = {
      Token: "Token Reward",
      ETH: "Native Coin Reward",
      NFT: "NFT Reward",
      MintableNFT: "Mintable NFT",
      Gift: "Physical Gift/Merch",
      Voucher: "Digital Voucher/Code",
      CustomPoints: "Custom Points System",
    };
    return labels[reward.type] || reward.type;
  }

  function getRewardSummary(reward: RewardConfig): string {
    if (reward.type === "Token" && reward.customTokenSymbol) {
      return `${reward.prizePool || "0"} ${reward.customTokenSymbol}`;
    }
    if (reward.type === "ETH" && reward.prizePool) {
      return `${reward.prizePool} ETH`;
    }
    if (reward.type === "NFT" && reward.nfts) {
      return `${reward.nfts.length} NFT${reward.nfts.length !== 1 ? "s" : ""}`;
    }
    if (reward.type === "MintableNFT" && reward.mintableNfts) {
      return `${reward.mintableNfts.length} variant${reward.mintableNfts.length !== 1 ? "s" : ""}`;
    }
    if (reward.type === "Gift" && reward.giftDescription) {
      return reward.giftDescription.substring(0, 50) + "...";
    }
    if (reward.type === "Voucher" && reward.voucherCodes) {
      return `${reward.voucherCodes.length} code${reward.voucherCodes.length !== 1 ? "s" : ""}`;
    }
    if (reward.type === "CustomPoints" && reward.customPointName) {
      return reward.customPointName;
    }
    return "Configure reward details";
  }
</script>

<div class="reward-config-section">
  <div class="section-header">
    <h2>Reward Configuration</h2>
    <p class="section-description">Add one or more rewards for your event</p>
  </div>

  {#if hasCustomPoints}
    <div class="info-banner">
      <span class="banner-icon">💡</span>
      <div class="banner-content">
        <strong>Custom Points System Active</strong>
        <p>
          Assign point values to tasks. Participants earn points by completing
          them.
        </p>
      </div>
    </div>
  {/if}

  <!-- Add Reward Selector -->
  <div class="add-reward-section">
    <label for="reward-type-selector">Add Reward Type</label>
    <div class="selector-row">
      <select id="reward-type-selector" bind:value={selectedRewardType}>
        <option value="">Select reward type to add...</option>
        {#each prizeOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      <button
        type="button"
        class="add-button"
        class:active={selectedRewardType}
        on:click={addReward}
        disabled={!selectedRewardType}
      >
        Add Reward
      </button>
    </div>
  </div>

  <!-- Rewards List -->
  {#if rewards.length > 0}
    <div class="rewards-list">
      {#each rewards as reward (reward.id)}
        <div class="reward-card">
          <div class="reward-card-header">
            <div class="reward-info">
              <h3>{getRewardLabel(reward)}</h3>
              <p class="reward-summary">{getRewardSummary(reward)}</p>
            </div>
            <button
              type="button"
              class="remove-button"
              on:click={() => removeReward(reward.id)}
              title="Remove reward"
            >
              Remove
            </button>
          </div>

          <div class="reward-config">
            <RewardBuilder
              {reward}
              {numWinners}
              {chainId}
              on:update={(e) => handleRewardUpdate(reward.id, e.detail)}
            />
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <div class="empty-icon">🎁</div>
      <p>No rewards added yet</p>
      <span class="empty-hint">Add a reward to incentivize participation</span>
    </div>
  {/if}
</div>

<style>
  .reward-config-section {
    margin-bottom: 2rem;
  }

  .section-header {
    margin-bottom: 2rem;
  }

  h2 {
    color: #fff;
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }

  .section-description {
    color: #888;
    font-size: 0.875rem;
  }

  .info-banner {
    display: flex;
    gap: 1rem;
    padding: 1.25rem;
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 12px;
    margin-bottom: 2rem;
  }

  .banner-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .banner-content strong {
    display: block;
    color: #8b5cf6;
    margin-bottom: 0.25rem;
  }

  .banner-content p {
    color: #aaa;
    font-size: 0.875rem;
    margin: 0;
  }

  .add-reward-section {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  label {
    display: block;
    color: #fff;
    font-weight: 500;
    margin-bottom: 0.75rem;
  }

  .selector-row {
    display: flex;
    gap: 1rem;
  }

  select {
    flex: 1;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #fff;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  select:focus {
    outline: none;
    border-color: #8b5cf6;
    background: rgba(255, 255, 255, 0.08);
  }

  select option {
    background: #1a1a1a;
    color: #fff;
  }

  .add-button {
    padding: 0.75rem 1.5rem;
    background: rgba(139, 92, 246, 0.2);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 8px;
    color: #8b5cf6;
    font-weight: 500;
    cursor: not-allowed;
    transition: all 0.3s ease;
    white-space: nowrap;
  }

  .add-button.active {
    background: #8b5cf6;
    border-color: #8b5cf6;
    color: #fff;
    cursor: pointer;
  }

  .add-button.active:hover {
    background: #7c3aed;
    transform: translateY(-1px);
  }

  .add-button:disabled {
    cursor: not-allowed;
  }

  .rewards-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .reward-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1.5rem;
    transition: all 0.3s ease;
  }

  .reward-card:hover {
    border-color: rgba(139, 92, 246, 0.3);
  }

  .reward-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .reward-info h3 {
    color: #fff;
    font-size: 1.125rem;
    margin-bottom: 0.5rem;
  }

  .reward-summary {
    color: #888;
    font-size: 0.875rem;
    margin: 0;
  }

  .remove-button {
    padding: 0.5rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
    color: #ef4444;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .remove-button:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: #ef4444;
  }

  .reward-config {
    /* RewardBuilder component will render here */
  }

  .empty-state {
    text-align: center;
    padding: 3rem 2rem;
    background: rgba(255, 255, 255, 0.02);
    border: 2px dashed rgba(255, 255, 255, 0.1);
    border-radius: 12px;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .empty-state p {
    color: #aaa;
    font-size: 1.125rem;
    margin-bottom: 0.5rem;
  }

  .empty-hint {
    color: #666;
    font-size: 0.875rem;
  }

  @media (max-width: 640px) {
    .selector-row {
      flex-direction: column;
    }

    .reward-card-header {
      flex-direction: column;
      gap: 1rem;
    }

    .remove-button {
      width: 100%;
    }
  }
</style>
