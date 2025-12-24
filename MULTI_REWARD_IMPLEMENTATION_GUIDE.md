# Multi-Reward System Implementation Guide

## Overview
This guide documents the implementation of a multi-reward system that allows users to add multiple reward types to an event, similar to how tasks work.

## ✅ Completed Steps

### 1. Type Definitions (DONE)
Created `RewardConfig` type in `src/routes/projects/create-event/+page.svelte`:

```typescript
type RewardConfig = {
  id: string;
  type: string; // "Token", "ETH", "NFT", etc.
  // Token/ETH specific
  chain?: string;
  tokenAddress?: string;
  prizePool?: string;
  distributionType?: "even" | "custom";
  positionRewards?: PositionReward[];
  customTokenSymbol?: string;
  customTokenAddress?: string;
  customTokenDecimals?: string;
  // NFT specific
  nfts?: NftInput[];
  nftDistributionType?: "even" | "custom";
  nftPositionDistribution?: NftDistributionPosition[];
  // Mintable NFT specific
  mintableNfts?: MintableNft[];
  mintableNftDistributionType?: "random" | "custom";
  mintableNftPositionDistribution?: NftDistributionPosition[];
  // Gift specific
  giftDescription?: string;
  giftValue?: string;
  // Voucher specific
  voucherDescription?: string;
  voucherCodes?: string[];
  // Custom Points specific
  customPointName?: string;
  leaderboardEnabled?: boolean;
};
```

### 2. State Management (DONE)
Replaced single `prizeType` with:
```typescript
let rewards: RewardConfig[] = [];
let selectedRewardType = "";
let editingRewardId: string | null = null;
```

### 3. Reward Management Functions (DONE)
Added functions:
- `addReward()` - Creates new reward with type-specific defaults
- `removeReward(id)` - Removes reward and cleans up resources
- `editReward(id)` - Toggles editing state
- `getRewardLabel(reward)` - Gets display label
- `getRewardSummary(reward)` - Gets summary text

### 4. Helper Functions (DONE)
Added reward-specific operations:
- `addNftToReward(rewardId)`
- `removeNftFromReward(rewardId, index)`
- `addMintableNftToReward(rewardId)`
- `removeMintableNftFromReward(rewardId, index)`
- `handleMintableNftImageUploadForReward(rewardId, index, event)`
- `addVoucherCodeToReward(rewardId, code)`
- `removeVoucherCodeFromReward(rewardId, index)`

### 5. RewardBuilder Component (DONE)
Created `src/lib/components/RewardBuilder.svelte`:
- Handles all reward type configurations
- Emits `update` event when reward changes
- Supports all reward types: Token, ETH, NFT, MintableNFT, Gift, Voucher, CustomPoints
- Includes proper styling and validation

## 🚧 Remaining Steps

### Step 1: Import RewardBuilder Component
Add to imports section of `src/routes/projects/create-event/+page.svelte`:

```typescript
import RewardBuilder from "$lib/components/RewardBuilder.svelte";
```

### Step 2: Replace Reward Configuration UI
Find the section starting with:
```svelte
{#if eventType === "quick_event"}
<div class="form-block">
  <h2 class="section-title">Reward Configuration</h2>
```

Replace the entire reward configuration section (lines ~1550-2050) with:

```svelte
{#if eventType === "quick_event"}
<div class="form-block">
  <h2 class="section-title">Reward Configuration</h2>
  <p class="section-description">
    Add one or more rewards for your event. You can combine different reward types.
  </p>

  <!-- Reward Type Selector -->
  <div class="form-group">
    <label for="reward-type-selector">Add Reward Type</label>
    <div class="task-selector-row">
      <select id="reward-type-selector" bind:value={selectedRewardType}>
        <option value="">Select reward type to add...</option>
        {#each detailedPrizeOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      <button
        type="button"
        class="ghost-btn"
        on:click={addReward}
        disabled={!selectedRewardType}
      >
        + Add Reward
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
            <div class="reward-actions">
              <button
                type="button"
                class="ghost-btn"
                on:click={() => editReward(reward.id)}
              >
                {editingRewardId === reward.id ? "▲ Collapse" : "▼ Configure"}
              </button>
              <button
                type="button"
                class="ghost-btn danger"
                on:click={() => removeReward(reward.id)}
              >
                Remove
              </button>
            </div>
          </div>

          {#if editingRewardId === reward.id}
            <div class="reward-config">
              <RewardBuilder
                bind:reward
                {numWinners}
                chainId={selectedChain || $chainId?.toString() || ""}
                on:update={(e) => {
                  rewards = rewards.map(r => r.id === reward.id ? e.detail : r);
                }}
              />
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <p class="empty-state">No rewards added yet. Add a reward type above to get started.</p>
  {/if}
</div>
{/if}
```

### Step 3: Add CSS for Rewards UI
Add to the `<style>` section:

```css
.task-selector-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.75rem;
  align-items: center;
}

.rewards-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.reward-card {
  background: rgba(12, 14, 30, 0.9);
  border-radius: 14px;
  padding: 1.25rem 1.1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.reward-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.reward-info h3 {
  margin: 0 0 0.25rem;
  font-size: 1.05rem;
  color: #f2f3ff;
}

.reward-summary {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(242, 243, 255, 0.7);
}

.reward-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.reward-config {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

@media (max-width: 720px) {
  .task-selector-row {
    grid-template-columns: 1fr;
  }

  .reward-card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .reward-actions {
    width: 100%;
  }
}
```

### Step 4: Update Validation Logic
Find the `isFormValid()` function and replace prize validation section with:

```typescript
// Rewards validation
if (eventType === "quick_event" && rewards.length === 0) {
  errors.push("Add at least one reward for your event");
}

for (const reward of rewards) {
  if (reward.type === "Token") {
    if (!reward.chain) {
      errors.push(`Token reward: Select a chain`);
    }
    if (!reward.tokenAddress) {
      errors.push(`Token reward: Select a token`);
    }
    if (reward.tokenAddress === "custom") {
      if (!reward.customTokenSymbol?.trim()) {
        errors.push(`Token reward: Enter custom token symbol`);
      }
      if (!reward.customTokenAddress?.trim()) {
        errors.push(`Token reward: Enter custom token address`);
      }
      if (!reward.customTokenDecimals) {
        errors.push(`Token reward: Enter token decimals`);
      }
    }
    if (reward.distributionType === "even") {
      if (!reward.prizePool || Number(reward.prizePool) <= 0) {
        errors.push(`Token reward: Enter a positive prize pool`);
      }
    } else if (reward.distributionType === "custom") {
      const totalPositions = reward.positionRewards?.length || 0;
      const filledPositions = reward.positionRewards?.filter(p => p.amount && Number(p.amount) > 0).length || 0;
      if (filledPositions < totalPositions) {
        errors.push(`Token reward: Fill in all position-based rewards`);
      }
    }
  } else if (reward.type === "ETH") {
    if (reward.distributionType === "even") {
      if (!reward.prizePool || Number(reward.prizePool) <= 0) {
        errors.push(`ETH reward: Enter a positive prize pool`);
      }
    } else if (reward.distributionType === "custom") {
      const totalPositions = reward.positionRewards?.length || 0;
      const filledPositions = reward.positionRewards?.filter(p => p.amount && Number(p.amount) > 0).length || 0;
      if (filledPositions < totalPositions) {
        errors.push(`ETH reward: Fill in all position-based rewards`);
      }
    }
  } else if (reward.type === "NFT") {
    if (!reward.nfts || reward.nfts.length === 0) {
      errors.push(`NFT reward: Add at least one NFT`);
    } else {
      const invalidNfts = reward.nfts.filter(nft => !nft.contract.trim() || !nft.tokenId.trim());
      if (invalidNfts.length > 0) {
        errors.push(`NFT reward: Fill in all NFT contract addresses and token IDs`);
      }
    }
  } else if (reward.type === "MintableNFT") {
    if (!reward.mintableNfts || reward.mintableNfts.length === 0) {
      errors.push(`Mintable NFT reward: Add at least one NFT variant`);
    } else {
      for (let i = 0; i < reward.mintableNfts.length; i++) {
        const nft = reward.mintableNfts[i];
        if (!nft.name.trim()) {
          errors.push(`Mintable NFT #${i + 1}: Enter NFT name`);
        }
        if (!nft.supply || Number(nft.supply) <= 0) {
          errors.push(`Mintable NFT #${i + 1}: Enter valid supply`);
        }
        if (reward.mintableNftDistributionType === "random" && (!nft.rarityPercentage || Number(nft.rarityPercentage) < 0)) {
          errors.push(`Mintable NFT #${i + 1}: Enter valid rarity percentage`);
        }
      }
    }
  } else if (reward.type === "Gift") {
    if (!reward.giftDescription?.trim()) {
      errors.push(`Gift reward: Enter a description`);
    }
    if (!reward.giftValue || Number(reward.giftValue) <= 0) {
      errors.push(`Gift reward: Enter estimated value`);
    }
  } else if (reward.type === "Voucher") {
    if (!reward.voucherDescription?.trim()) {
      errors.push(`Voucher reward: Enter a description`);
    }
    if (!reward.voucherCodes || reward.voucherCodes.length === 0) {
      errors.push(`Voucher reward: Add at least one voucher code`);
    }
    const winnersInt = Number(numWinners);
    if (winnersInt && winnersInt > 0 && reward.voucherCodes && reward.voucherCodes.length < winnersInt) {
      errors.push(`Voucher reward: Need at least ${winnersInt} codes for ${winnersInt} winners (currently have ${reward.voucherCodes.length})`);
    }
  } else if (reward.type === "CustomPoints") {
    if (!reward.customPointName?.trim()) {
      errors.push(`Custom Points reward: Enter a point name`);
    }
  }
}
```

### Step 5: Update Payload Construction
In the `createEvent()` function, find the prize details payload section and replace with:

```typescript
// Build rewards payload
const rewardsPayload = [];
for (const reward of rewards) {
  const rewardPayload: any = {
    id: reward.id,
    type: reward.type
  };

  if (reward.type === "Token") {
    rewardPayload.chain = {
      id: reward.chain,
      name: chainOptions.find(opt => opt.id === reward.chain)?.label ?? reward.chain
    };
    rewardPayload.token_address = reward.tokenAddress;
    rewardPayload.prize_pool = reward.prizePool ? Number(reward.prizePool) : null;
    rewardPayload.distribution_type = reward.distributionType;
    if (reward.distributionType === "custom" && reward.positionRewards) {
      rewardPayload.position_rewards = reward.positionRewards.map(r => ({
        position: r.position,
        amount: Number(r.amount)
      }));
    }
    if (reward.tokenAddress === "custom") {
      rewardPayload.token_metadata = {
        symbol: reward.customTokenSymbol?.trim(),
        address: reward.customTokenAddress?.trim(),
        decimals: Number(reward.customTokenDecimals)
      };
    }
  } else if (reward.type === "ETH") {
    rewardPayload.prize_pool = reward.prizePool ? Number(reward.prizePool) : null;
    rewardPayload.distribution_type = reward.distributionType;
    if (reward.distributionType === "custom" && reward.positionRewards) {
      rewardPayload.position_rewards = reward.positionRewards.map(r => ({
        position: r.position,
        amount: Number(r.amount)
      }));
    }
  } else if (reward.type === "NFT") {
    rewardPayload.nfts = reward.nfts?.map(nft => ({
      id: nft.id,
      contract: nft.contract.trim(),
      tokenId: nft.tokenId.trim()
    })) || [];
    rewardPayload.nft_distribution_type = reward.nftDistributionType;
    if (reward.nftDistributionType === "custom") {
      rewardPayload.nft_position_distribution = reward.nftPositionDistribution;
    }
  } else if (reward.type === "MintableNFT") {
    // Upload mintable NFT images
    const mintableNftAssets = [];
    for (const nft of reward.mintableNfts || []) {
      let nftImageAsset = nft.uploadedImage;
      if (nft.imageFile) {
        nftImageAsset = await uploadAsset(nft.imageFile, "nft");
      }
      mintableNftAssets.push({
        id: nft.id,
        name: nft.name.trim(),
        description: nft.description.trim(),
        image_url: nftImageAsset?.publicUrl || "",
        supply: Number(nft.supply),
        rarity: nft.rarity,
        rarity_percentage: Number(nft.rarityPercentage)
      });
    }
    rewardPayload.mintable_nfts = mintableNftAssets;
    rewardPayload.mintable_nft_distribution_type = reward.mintableNftDistributionType;
    if (reward.mintableNftDistributionType === "custom") {
      rewardPayload.mintable_nft_position_distribution = reward.mintableNftPositionDistribution;
    }
  } else if (reward.type === "Gift") {
    rewardPayload.gift_description = reward.giftDescription?.trim();
    rewardPayload.gift_value = Number(reward.giftValue);
  } else if (reward.type === "Voucher") {
    rewardPayload.voucher_description = reward.voucherDescription?.trim();
    rewardPayload.voucher_codes = reward.voucherCodes || [];
  } else if (reward.type === "CustomPoints") {
    rewardPayload.custom_point_name = reward.customPointName?.trim();
    rewardPayload.leaderboard_enabled = reward.leaderboardEnabled || false;
  }

  rewardsPayload.push(rewardPayload);
}

// Update the fetch payload
const payload = {
  // ... other fields
  rewards: rewardsPayload, // Replace prize_details with rewards array
  // ... rest of fields
};
```

### Step 6: Update Autosave/Draft Restore
In the `saveFormDraft()` function, add:
```typescript
rewards: rewards.map(r => ({
  ...r,
  // Exclude File objects and image previews from draft
  mintableNfts: r.mintableNfts?.map(nft => ({
    ...nft,
    imageFile: null,
    imagePreview: ""
  }))
}))
```

In the draft restore section, add:
```typescript
rewards = draft.rewards || [];
```

### Step 7: Update Form Reset
In the success handler after event creation, add:
```typescript
rewards = [];
selectedRewardType = "";
editingRewardId = null;
```

## Testing Checklist

- [ ] Can add multiple rewards of different types
- [ ] Can configure each reward type properly
- [ ] Can edit and collapse reward configurations
- [ ] Can remove rewards
- [ ] Validation works for all reward types
- [ ] Form submission includes all rewards
- [ ] Autosave preserves rewards
- [ ] Draft restore works with rewards
- [ ] UI is responsive on mobile
- [ ] Reward summaries display correctly

## Benefits of Multi-Reward System

1. **Flexibility**: Events can have multiple reward types (e.g., Token + NFT + Points)
2. **Better UX**: Similar to task management - familiar pattern
3. **Scalability**: Easy to add new reward types in the future
4. **Organization**: Each reward is self-contained and manageable
5. **Validation**: Per-reward validation provides clear error messages

## Notes

- The `RewardBuilder` component handles all reward-specific UI
- Each reward has its own ID for tracking
- Rewards can be expanded/collapsed independently
- Image uploads for mintable NFTs are handled within each reward
- Voucher codes are managed per-reward

## Next Steps

After implementing the above steps:
1. Test thoroughly with different reward combinations
2. Update backend API to handle rewards array
3. Update event display pages to show multiple rewards
4. Add reward type icons for better visual distinction
5. Consider adding reward templates for common combinations
