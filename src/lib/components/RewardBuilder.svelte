<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { TOKEN_LIST } from "$lib/tokens";

  export let reward: any; // RewardConfig type
  export let numWinners: string;
  export let chainId: string;

  const dispatch = createEventDispatcher();

  let availableTokens: { symbol: string; address: string; decimals: number }[] = [];
  let voucherCodeInput = "";

  $: {
    const effectiveChainId = reward.chain || chainId;
    if (effectiveChainId && Number(effectiveChainId) in TOKEN_LIST) {
      availableTokens = TOKEN_LIST[Number(effectiveChainId)];
    } else {
      availableTokens = [];
    }
  }

  $: if (reward.type === "NFT" && (!reward.nfts || reward.nfts.length === 0)) {
    dispatch("update", { ...reward, nfts: [{ id: crypto.randomUUID(), contract: "", tokenId: "" }] });
  }

  $: if (reward.type === "Token" || reward.type === "ETH") {
    if (reward.distributionType === "custom" && numWinners) {
      const count = Math.min(Number(numWinners) || 0, 10);
      if (!reward.positionRewards || reward.positionRewards.length !== count) {
        const newPositionRewards = Array.from({ length: count }, (_, i) => ({
          position: i + 1,
          amount: reward.positionRewards?.[i]?.amount || ""
        }));
        dispatch("update", { ...reward, positionRewards: newPositionRewards });
      }
    }
  }

  function handleAddNft() {
    const newNfts = [...(reward.nfts || []), { id: crypto.randomUUID(), contract: "", tokenId: "" }];
    dispatch("update", { ...reward, nfts: newNfts });
  }

  function handleRemoveNft(index: number) {
    const newNfts = reward.nfts.filter((_: any, i: number) => i !== index);
    dispatch("update", { ...reward, nfts: newNfts });
  }

  function handleAddMintableNft() {
    const defaultPercentage = reward.mintableNfts?.length === 0 ? "100" : "0";
    const newMintableNfts = [
      ...(reward.mintableNfts || []),
      {
        id: crypto.randomUUID(),
        name: "",
        description: "",
        imageFile: null,
        imagePreview: "",
        supply: "",
        rarity: "Common",
        rarityPercentage: defaultPercentage,
        uploadedImage: null
      }
    ];
    dispatch("update", { ...reward, mintableNfts: newMintableNfts });
  }

  function handleRemoveMintableNft(index: number) {
    const nft = reward.mintableNfts[index];
    if (nft?.imagePreview) {
      URL.revokeObjectURL(nft.imagePreview);
    }
    const newMintableNfts = reward.mintableNfts.filter((_: any, i: number) => i !== index);
    dispatch("update", { ...reward, mintableNfts: newMintableNfts });
  }

  function handleMintableNftImageUpload(index: number, event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    const nft = reward.mintableNfts[index];
    if (nft.imagePreview) {
      URL.revokeObjectURL(nft.imagePreview);
    }

    if (!file) {
      reward.mintableNfts[index].imageFile = null;
      reward.mintableNfts[index].imagePreview = "";
      dispatch("update", { ...reward, mintableNfts: [...reward.mintableNfts] });
      return;
    }

    const MAX_NFT_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_NFT_IMAGE_SIZE) {
      alert("NFT image must be 2 MB or less.");
      input.value = "";
      return;
    }

    reward.mintableNfts[index].imageFile = file;
    reward.mintableNfts[index].imagePreview = URL.createObjectURL(file);
    dispatch("update", { ...reward, mintableNfts: [...reward.mintableNfts] });
  }

  function handleAddVoucherCode() {
    if (!voucherCodeInput.trim()) return;
    const newCodes = [...(reward.voucherCodes || []), voucherCodeInput.trim()];
    dispatch("update", { ...reward, voucherCodes: newCodes });
    voucherCodeInput = "";
  }

  function handleRemoveVoucherCode(index: number) {
    const newCodes = reward.voucherCodes.filter((_: any, i: number) => i !== index);
    dispatch("update", { ...reward, voucherCodes: newCodes });
  }

  function handleTokenSelect(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (value !== "custom") {
      dispatch("update", {
        ...reward,
        tokenAddress: value,
        customTokenSymbol: "",
        customTokenAddress: "",
        customTokenDecimals: ""
      });
    } else {
      dispatch("update", { ...reward, tokenAddress: value });
    }
  }

  function updateReward(updates: any) {
    dispatch("update", { ...reward, ...updates });
  }
</script>

<div class="reward-builder">
  {#if reward.type === "Token"}
    <div class="form-group">
      <label for="prize-chain-{reward.id}">Token chain</label>
      <select
        id="prize-chain-{reward.id}"
        value={reward.chain}
        on:change={(e) => updateReward({ chain: e.currentTarget.value })}
      >
        <option value="">Select chain</option>
        <option value="1">Ethereum</option>
        <option value="137">Polygon</option>
        <option value="56">BSC</option>
        <option value="42161">Arbitrum</option>
        <option value="10">Optimism</option>
      </select>
    </div>

    {#if reward.chain}
      <div class="form-group">
        <label for="prize-token-{reward.id}">Token</label>
        <select
          id="prize-token-{reward.id}"
          value={reward.tokenAddress}
          on:change={handleTokenSelect}
        >
          <option value="">Select token</option>
          {#each availableTokens as token}
            <option value={token.address}>{token.symbol}</option>
          {/each}
          <option value="custom">Custom token</option>
        </select>
      </div>

      {#if reward.tokenAddress === "custom"}
        <div class="grid-two">
          <div class="form-group">
            <label for="custom-token-symbol-{reward.id}">Token symbol</label>
            <input
              id="custom-token-symbol-{reward.id}"
              type="text"
              placeholder="e.g. MYT"
              value={reward.customTokenSymbol || ""}
              on:input={(e) => updateReward({ customTokenSymbol: e.currentTarget.value })}
            />
          </div>
          <div class="form-group">
            <label for="custom-token-decimals-{reward.id}">Token decimals</label>
            <input
              id="custom-token-decimals-{reward.id}"
              type="number"
              min="0"
              step="1"
              value={reward.customTokenDecimals || ""}
              on:input={(e) => updateReward({ customTokenDecimals: e.currentTarget.value })}
            />
          </div>
        </div>
        <div class="form-group">
          <label for="custom-token-address-{reward.id}">Token contract address</label>
          <input
            id="custom-token-address-{reward.id}"
            type="text"
            placeholder="0x..."
            value={reward.customTokenAddress || ""}
            on:input={(e) => updateReward({ customTokenAddress: e.currentTarget.value })}
          />
        </div>
      {/if}

      {#if reward.tokenAddress}
        <div class="form-group">
          <label for="distribution-type-{reward.id}">Reward distribution</label>
          <select
            id="distribution-type-{reward.id}"
            value={reward.distributionType}
            on:change={(e) => updateReward({ distributionType: e.currentTarget.value })}
          >
            <option value="even">Even split among winners</option>
            <option value="custom">Custom amount per position</option>
          </select>
        </div>

        {#if reward.distributionType === "even"}
          <div class="form-group">
            <label for="prize-pool-{reward.id}">Total prize pool</label>
            <input
              id="prize-pool-{reward.id}"
              type="number"
              min="0"
              step="any"
              value={reward.prizePool || ""}
              on:input={(e) => updateReward({ prizePool: e.currentTarget.value })}
              required
            />
          </div>
        {:else if reward.distributionType === "custom" && numWinners && Number(numWinners) > 0}
          <div class="form-group">
            <label>Position-based rewards</label>
            <div class="position-rewards-list">
              {#each reward.positionRewards || [] as posReward, i (posReward.position)}
                <div class="position-reward-row">
                  <span class="position-label">#{posReward.position}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Amount"
                    value={posReward.amount}
                    on:input={(e) => {
                      const newPositionRewards = [...reward.positionRewards];
                      newPositionRewards[i].amount = e.currentTarget.value;
                      updateReward({ positionRewards: newPositionRewards });
                    }}
                    required
                  />
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {/if}
    {/if}
  {:else if reward.type === "ETH"}
    <div class="form-group">
      <label for="distribution-type-eth-{reward.id}">Reward distribution</label>
      <select
        id="distribution-type-eth-{reward.id}"
        value={reward.distributionType}
        on:change={(e) => updateReward({ distributionType: e.currentTarget.value })}
      >
        <option value="even">Even split among winners</option>
        <option value="custom">Custom amount per position</option>
      </select>
    </div>

    {#if reward.distributionType === "even"}
      <div class="form-group">
        <label for="native-prize-pool-{reward.id}">Total prize pool (ETH)</label>
        <input
          id="native-prize-pool-{reward.id}"
          type="number"
          min="0"
          step="any"
          value={reward.prizePool || ""}
          on:input={(e) => updateReward({ prizePool: e.currentTarget.value })}
          required
        />
      </div>
    {:else if reward.distributionType === "custom" && numWinners && Number(numWinners) > 0}
      <div class="form-group">
        <label>Position-based rewards</label>
        <div class="position-rewards-list">
          {#each reward.positionRewards || [] as posReward, i (posReward.position)}
            <div class="position-reward-row">
              <span class="position-label">#{posReward.position}</span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="ETH amount"
                value={posReward.amount}
                on:input={(e) => {
                  const newPositionRewards = [...reward.positionRewards];
                  newPositionRewards[i].amount = e.currentTarget.value;
                  updateReward({ positionRewards: newPositionRewards });
                }}
                required
              />
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {:else if reward.type === "NFT"}
    <div class="form-group">
      <label for="nft-distribution-type-{reward.id}">NFT Distribution</label>
      <select
        id="nft-distribution-type-{reward.id}"
        value={reward.nftDistributionType}
        on:change={(e) => updateReward({ nftDistributionType: e.currentTarget.value })}
      >
        <option value="even">Even distribution</option>
        <option value="custom">Custom (assign to positions)</option>
      </select>
    </div>

    <div class="form-group">
      <div class="group-header">
        <h3>NFT prizes</h3>
        <button type="button" class="ghost-btn" on:click={handleAddNft}>+ Add NFT</button>
      </div>
      <div class="nft-list">
        {#each reward.nfts || [] as nft, index (nft.id)}
          <div class="nft-row">
            <input
              type="text"
              placeholder="Contract address"
              value={nft.contract}
              on:input={(e) => {
                const newNfts = [...reward.nfts];
                newNfts[index].contract = e.currentTarget.value;
                updateReward({ nfts: newNfts });
              }}
              required
            />
            <input
              type="text"
              placeholder="Token ID"
              value={nft.tokenId}
              on:input={(e) => {
                const newNfts = [...reward.nfts];
                newNfts[index].tokenId = e.currentTarget.value;
                updateReward({ nfts: newNfts });
              }}
              required
            />
            <button type="button" class="ghost-btn danger" on:click={() => handleRemoveNft(index)}>
              Remove
            </button>
          </div>
        {/each}
      </div>
    </div>
  {:else if reward.type === "MintableNFT"}
    <div class="form-group">
      <label for="mintable-nft-distribution-type-{reward.id}">Distribution Type</label>
      <select
        id="mintable-nft-distribution-type-{reward.id}"
        value={reward.mintableNftDistributionType}
        on:change={(e) => updateReward({ mintableNftDistributionType: e.currentTarget.value })}
      >
        <option value="random">Random (probability-based)</option>
        <option value="custom">Custom (assign to positions)</option>
      </select>
    </div>

    <div class="form-group">
      <div class="group-header">
        <h3>NFT Variants</h3>
        <button type="button" class="ghost-btn" on:click={handleAddMintableNft}>+ Add Variant</button>
      </div>
      <div class="mintable-nft-list">
        {#each reward.mintableNfts || [] as nft, index (nft.id)}
          <div class="mintable-nft-card">
            <div class="form-group">
              <label>NFT Name</label>
              <input
                type="text"
                placeholder="e.g., Legendary Dragon"
                value={nft.name}
                on:input={(e) => {
                  const newNfts = [...reward.mintableNfts];
                  newNfts[index].name = e.currentTarget.value;
                  updateReward({ mintableNfts: newNfts });
                }}
                required
              />
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea
                placeholder="NFT description"
                value={nft.description}
                on:input={(e) => {
                  const newNfts = [...reward.mintableNfts];
                  newNfts[index].description = e.currentTarget.value;
                  updateReward({ mintableNfts: newNfts });
                }}
                rows="2"
              />
            </div>

            <div class="form-group">
              <label>Image</label>
              <input
                type="file"
                accept="image/*"
                on:change={(e) => handleMintableNftImageUpload(index, e)}
              />
              {#if nft.imagePreview}
                <img src={nft.imagePreview} alt="NFT preview" class="nft-image-preview" />
              {/if}
            </div>

            <div class="grid-two">
              <div class="form-group">
                <label>Supply</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g., 100"
                  value={nft.supply}
                  on:input={(e) => {
                    const newNfts = [...reward.mintableNfts];
                    newNfts[index].supply = e.currentTarget.value;
                    updateReward({ mintableNfts: newNfts });
                  }}
                  required
                />
              </div>

              <div class="form-group">
                <label>Rarity</label>
                <select
                  value={nft.rarity}
                  on:change={(e) => {
                    const newNfts = [...reward.mintableNfts];
                    newNfts[index].rarity = e.currentTarget.value;
                    updateReward({ mintableNfts: newNfts });
                  }}
                >
                  <option>Common</option>
                  <option>Uncommon</option>
                  <option>Rare</option>
                  <option>Epic</option>
                  <option>Legendary</option>
                </select>
              </div>
            </div>

            {#if reward.mintableNftDistributionType === "random"}
              <div class="form-group">
                <label>Rarity % (probability)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g., 10"
                  value={nft.rarityPercentage}
                  on:input={(e) => {
                    const newNfts = [...reward.mintableNfts];
                    newNfts[index].rarityPercentage = e.currentTarget.value;
                    updateReward({ mintableNfts: newNfts });
                  }}
                  required
                />
              </div>
            {/if}

            <button type="button" class="ghost-btn danger" on:click={() => handleRemoveMintableNft(index)}>
              Remove Variant
            </button>
          </div>
        {/each}
      </div>
    </div>
  {:else if reward.type === "Gift"}
    <div class="form-group">
      <label for="gift-description-{reward.id}">Gift/Merch Description</label>
      <textarea
        id="gift-description-{reward.id}"
        placeholder="Describe the physical gift or merchandise"
        value={reward.giftDescription || ""}
        on:input={(e) => updateReward({ giftDescription: e.currentTarget.value })}
        rows="3"
        required
      />
    </div>

    <div class="form-group">
      <label for="gift-value-{reward.id}">Estimated Value (USD)</label>
      <input
        id="gift-value-{reward.id}"
        type="number"
        min="0"
        step="0.01"
        placeholder="e.g., 50"
        value={reward.giftValue || ""}
        on:input={(e) => updateReward({ giftValue: e.currentTarget.value })}
        required
      />
    </div>
  {:else if reward.type === "Voucher"}
    <div class="form-group">
      <label for="voucher-description-{reward.id}">Voucher Description</label>
      <textarea
        id="voucher-description-{reward.id}"
        placeholder="Describe what the voucher is for"
        value={reward.voucherDescription || ""}
        on:input={(e) => updateReward({ voucherDescription: e.currentTarget.value })}
        rows="3"
        required
      />
    </div>

    <div class="form-group">
      <label>Voucher Codes</label>
      <div class="voucher-input-row">
        <input
          type="text"
          placeholder="Enter voucher code"
          bind:value={voucherCodeInput}
          on:keypress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddVoucherCode())}
        />
        <button type="button" class="ghost-btn" on:click={handleAddVoucherCode}>
          Add Code
        </button>
      </div>
      {#if reward.voucherCodes && reward.voucherCodes.length > 0}
        <div class="voucher-codes-list">
          {#each reward.voucherCodes as code, index}
            <div class="voucher-code-item">
              <span>{code}</span>
              <button
                type="button"
                class="ghost-btn danger small"
                on:click={() => handleRemoveVoucherCode(index)}
              >
                Remove
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {:else if reward.type === "CustomPoints"}
    <div class="form-group">
      <label for="custom-point-name-{reward.id}">Point Name</label>
      <input
        id="custom-point-name-{reward.id}"
        type="text"
        placeholder="e.g., XP, Stars, Credits"
        value={reward.customPointName || ""}
        on:input={(e) => updateReward({ customPointName: e.currentTarget.value })}
        required
      />
      <p class="field-hint">Choose a name for your custom points</p>
    </div>

    <div class="form-group">
      <label class="checkbox-label">
        <input
          type="checkbox"
          checked={reward.leaderboardEnabled || false}
          on:change={(e) => updateReward({ leaderboardEnabled: e.currentTarget.checked })}
        />
        <span>Enable Leaderboard</span>
      </label>
      <p class="field-hint">Display a leaderboard showing top participants by points earned</p>
    </div>
  {/if}
</div>

<style>
  .reward-builder {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .grid-two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .group-header h3 {
    margin: 0;
    font-size: 1rem;
  }

  .nft-list,
  .mintable-nft-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .nft-row {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 0.75rem;
    align-items: center;
  }

  .mintable-nft-card {
    background: rgba(12, 14, 30, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .nft-image-preview {
    max-width: 200px;
    max-height: 200px;
    border-radius: 8px;
    margin-top: 0.5rem;
  }

  .position-rewards-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .position-reward-row {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.75rem;
    align-items: center;
  }

  .position-label {
    font-weight: 600;
    color: rgba(242, 243, 255, 0.9);
    min-width: 2.5rem;
  }

  .voucher-input-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.75rem;
  }

  .voucher-codes-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .voucher-code-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background: rgba(12, 14, 30, 0.6);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    font-weight: 600;
  }

  .checkbox-label input[type="checkbox"] {
    width: 1.25rem;
    height: 1.25rem;
    cursor: pointer;
  }

  .checkbox-label span {
    user-select: none;
  }

  .field-hint {
    margin: 0.3rem 0 0;
    color: rgba(242, 243, 255, 0.7);
    font-size: 0.85rem;
    line-height: 1.5;
  }

  label {
    font-weight: 600;
    font-size: 0.95rem;
  }

  input,
  textarea,
  select {
    background: rgba(26, 28, 45, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    font-size: 0.95rem;
    color: #f6f6ff;
    transition: border-color 0.2s ease;
  }

  input:focus,
  textarea:focus,
  select:focus {
    outline: none;
    border-color: rgba(99, 102, 241, 0.6);
  }

  .ghost-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #f2f3ff;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .ghost-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .ghost-btn.danger {
    border-color: rgba(239, 68, 68, 0.4);
    color: rgba(248, 113, 113, 0.95);
  }

  .ghost-btn.danger:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.6);
  }

  .ghost-btn.small {
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
  }

  @media (max-width: 720px) {
    .grid-two {
      grid-template-columns: 1fr;
    }

    .nft-row {
      grid-template-columns: 1fr;
    }
  }
</style>
