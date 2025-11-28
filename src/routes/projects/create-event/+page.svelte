<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { ethers } from "ethers";
  import { goto } from "$app/navigation";
  import { chainId } from "$lib/wallet";
  import { TOKEN_LIST } from "$lib/tokens";
  import { CONTRACTS } from "$lib/contracts";
  import { taskRegistry } from "$lib/tasks";
  import type { TaskInstance, TaskRegistryEntry, TaskTypeKey } from "$lib/tasks/TaskTypes";
  import { browser } from "$app/environment";

  type NftInput = {
    id: string;
    contract: string;
    tokenId: string;
  };

  type PositionReward = {
    position: number;
    amount: string;
  };

  type MintableNft = {
    id: string;
    name: string;
    description: string;
    imageFile: File | null;
    imagePreview: string;
    supply: string;
    rarity: string;
    uploadedImage: UploadedAsset | null;
  };

  const registryEntries = Object.entries(taskRegistry) as [TaskTypeKey, TaskRegistryEntry][];

  const taskOptions = registryEntries
    .filter(([key]) => key !== "irl")
    .map(([value, entry]) => ({ value, label: entry.label }));

  const detailedPrizeOptions: { value: string; label: string }[] = [
    { value: "Token", label: "Token" },
    { value: "ETH", label: "Native coin" },
    { value: "NFT", label: "Existing NFT" },
    { value: "MintableNFT", label: "Mintable NFT (participants mint after tasks)" }
  ];

  const MAX_BANNER_SIZE = 500 * 1024;
  const MAX_LOGO_SIZE = 150 * 1024;

  type UploadKind = "banner" | "logo" | "nft";
  type UploadedAsset = {
    path: string;
    publicUrl: string;
  };

  const chainOptions = Object.keys(TOKEN_LIST)
    .map((id) => ({
      id,
      label: CONTRACTS[Number(id)]?.name ?? `Chain ${id}`
    }))
    .sort((a, b) => Number(a.id) - Number(b.id));

  const clone = <T>(input: T): T =>
    typeof structuredClone === "function"
      ? structuredClone(input)
      : JSON.parse(JSON.stringify(input));

  const generateId = () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `task_${Math.random().toString(36).slice(2, 10)}`;

  function getTaskLabel(type: TaskTypeKey): string {
    return taskRegistry[type]?.label ?? type;
  }

  function summariseConfig(config: Record<string, unknown>): string {
    try {
      return JSON.stringify(config, null, 2);
    } catch (error) {
      return String(config);
    }
  }

  let eventTitle = "";
  let eventDescription = "";
  let startDate = "";
  let startTime = "";
  let endDate = "";
  let endTime = "";
  let eventStartISO: string | null = null;
  let eventEndISO: string | null = null;
  let scheduleError = "";

  let numWinners = "";
  let bannerFile: File | null = null;
  let bannerPreview = "";
  let logoFile: File | null = null;
  let logoPreview = "";
  let bannerError = "";
  let logoError = "";

  let selectedTaskType: TaskTypeKey | "" = "";
  let creatingTaskType: TaskTypeKey | null = null;
  let editingTaskIndex: number | null = null;
  let tasks: TaskInstance[] = [];

  let prizeType = "";
  let prizeAddress = "";
  let prizePool = "";
  let distributionType: "even" | "custom" = "even";
  let positionRewards: PositionReward[] = [];
  let maxTickets = "";
  let nfts: NftInput[] = [];
  let mintableNfts: MintableNft[] = [];
  let availableTokens: { symbol: string; address: string; decimals: number }[] = [];
  let selectedChain = "";
  let customTokenSymbol = "";
  let customTokenAddress = "";
  let customTokenDecimals = "";

  let submitAttempted = false;
  let validationErrors: string[] = [];
  let isSaving = false;
  let uploadedBanner: UploadedAsset | null = null;
  let uploadedLogo: UploadedAsset | null = null;
  let uploadError = "";
  let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  const AUTOSAVE_KEY = "event-creation-draft";

  function handleTokenSelect(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (value !== "custom") {
      customTokenSymbol = "";
      customTokenAddress = "";
      customTokenDecimals = "";
    }
    prizeAddress = value;
  }

  $: defaultChain = $chainId != null ? String($chainId) : "";

  $: {
    const effectiveChainId = selectedChain || defaultChain;
    if (effectiveChainId && Number(effectiveChainId) in TOKEN_LIST) {
      selectedChain = effectiveChainId;
      availableTokens = TOKEN_LIST[Number(effectiveChainId)];
    } else {
      availableTokens = [];
    }
  }

  $: if (prizeType === "NFT" && nfts.length === 0) {
    nfts = [{ id: generateId(), contract: "", tokenId: "" }];
  }

  $: if (prizeType === "MintableNFT" && mintableNfts.length === 0) {
    mintableNfts = [{
      id: generateId(),
      name: "",
      description: "",
      imageFile: null,
      imagePreview: "",
      supply: "",
      rarity: "Common",
      uploadedImage: null
    }];
  }

  $: if (distributionType === "custom" && numWinners) {
    const count = Math.min(Number(numWinners) || 0, 10);
    if (positionRewards.length !== count) {
      positionRewards = Array.from({ length: count }, (_, i) => ({
        position: i + 1,
        amount: positionRewards[i]?.amount || ""
      }));
    }
  }

  function isValidEthereumAddress(address: string): boolean {
    if (!address) return false;
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  function saveFormDraft() {
    if (!browser) return;
    const draft = {
      eventTitle,
      eventDescription,
      startDate,
      startTime,
      endDate,
      endTime,
      numWinners,
      selectedChain,
      prizeType,
      prizeAddress,
      prizePool,
      distributionType,
      positionRewards,
      customTokenSymbol,
      customTokenAddress,
      customTokenDecimals,
      nfts,
      mintableNfts: mintableNfts.map(n => ({
        id: n.id,
        name: n.name,
        description: n.description,
        supply: n.supply,
        rarity: n.rarity,
        imagePreview: n.imagePreview
      })),
      tasks,
      timestamp: Date.now()
    };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft));
  }

  function loadFormDraft() {
    if (!browser) return;
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (!saved) return;
      const draft = JSON.parse(saved);
      const age = Date.now() - (draft.timestamp || 0);
      if (age > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(AUTOSAVE_KEY);
        return;
      }
      eventTitle = draft.eventTitle || "";
      eventDescription = draft.eventDescription || "";
      startDate = draft.startDate || "";
      startTime = draft.startTime || "";
      endDate = draft.endDate || "";
      endTime = draft.endTime || "";
      numWinners = draft.numWinners || "";
      selectedChain = draft.selectedChain || "";
      prizeType = draft.prizeType || "";
      prizeAddress = draft.prizeAddress || "";
      prizePool = draft.prizePool || "";
      distributionType = draft.distributionType || "even";
      positionRewards = draft.positionRewards || [];
      customTokenSymbol = draft.customTokenSymbol || "";
      customTokenAddress = draft.customTokenAddress || "";
      customTokenDecimals = draft.customTokenDecimals || "";
      nfts = draft.nfts || [];
      mintableNfts = (draft.mintableNfts || []).map((n: any) => ({
        ...n,
        imageFile: null,
        uploadedImage: null
      }));
      tasks = draft.tasks || [];
      updateDateTimes();
    } catch (err) {
      console.warn("Failed to restore draft", err);
    }
  }

  function clearFormDraft() {
    if (!browser) return;
    localStorage.removeItem(AUTOSAVE_KEY);
  }

  function triggerAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(saveFormDraft, 1000);
  }

  $: if (browser && (eventTitle || eventDescription || startDate || prizeType)) {
    triggerAutosave();
  }

  onMount(() => {
    loadFormDraft();
  });

  function handleBannerUpload(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (bannerPreview) {
      URL.revokeObjectURL(bannerPreview);
      bannerPreview = "";
    }

    if (!file) {
      bannerFile = null;
      bannerError = "";
      return;
    }

    if (file.size > MAX_BANNER_SIZE) {
      bannerFile = null;
      bannerError = "Banner image must be 500 KB or less.";
      input.value = "";
      return;
    }

    bannerError = "";
    uploadedBanner = null;
    bannerFile = file;
    bannerPreview = URL.createObjectURL(file);
  }

  function handleLogoUpload(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
      logoPreview = "";
    }

    if (!file) {
      logoFile = null;
      logoError = "";
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      logoFile = null;
      logoError = "Logo must be 150 KB or less.";
      input.value = "";
      return;
    }

    logoError = "";
    uploadedLogo = null;
    logoFile = file;
    logoPreview = URL.createObjectURL(file);
  }

  onDestroy(() => {
    if (bannerPreview) {
      URL.revokeObjectURL(bannerPreview);
    }
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
  });

  function updateDateTimes() {
    scheduleError = "";

    if (startDate && startTime) {
      const [hours, minutes] = startTime.split(":").map(Number);
      const start = new Date(startDate);
      start.setHours(hours, minutes, 0, 0);
      eventStartISO = start.toISOString();
    } else {
      eventStartISO = null;
    }

    if (endDate && endTime) {
      const [hours, minutes] = endTime.split(":").map(Number);
      const endInstance = new Date(endDate);
      endInstance.setHours(hours, minutes, 0, 0);

      if (eventStartISO && endInstance <= new Date(eventStartISO)) {
        scheduleError = "End time must be after the start time";
        eventEndISO = null;
      } else if (endInstance <= new Date()) {
        scheduleError = "End time must be in the future";
        eventEndISO = null;
      } else {
        eventEndISO = endInstance.toISOString();
      }
    } else {
      eventEndISO = null;
    }
  }

  function startCreateTask() {
    if (!selectedTaskType) return;
    creatingTaskType = selectedTaskType;
    editingTaskIndex = null;
  }

  function handleTaskSave(config: Record<string, unknown>) {
    if (!creatingTaskType) return;

    if (editingTaskIndex !== null) {
      tasks = tasks.map((task, index) =>
        index === editingTaskIndex ? { ...task, config: clone(config) } : task
      );
    } else {
      tasks = [
        ...tasks,
        {
          id: generateId(),
          type: creatingTaskType,
          config: clone(config)
        }
      ];
    }

    creatingTaskType = null;
    editingTaskIndex = null;
    selectedTaskType = "";
  }

  function handleTaskCancel() {
    creatingTaskType = null;
    editingTaskIndex = null;
  }

  function addMintableNft() {
    mintableNfts = [
      ...mintableNfts,
      {
        id: generateId(),
        name: "",
        description: "",
        imageFile: null,
        imagePreview: "",
        supply: "",
        rarity: "Common",
        uploadedImage: null
      }
    ];
  }

  function removeMintableNft(index: number) {
    if (mintableNfts[index].imagePreview) {
      URL.revokeObjectURL(mintableNfts[index].imagePreview);
    }
    mintableNfts = mintableNfts.filter((_, i) => i !== index);
  }

  function handleMintableNftImageUpload(index: number, event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (mintableNfts[index].imagePreview) {
      URL.revokeObjectURL(mintableNfts[index].imagePreview);
    }

    if (!file) {
      mintableNfts[index].imageFile = null;
      mintableNfts[index].imagePreview = "";
      return;
    }

    const MAX_NFT_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_NFT_IMAGE_SIZE) {
      alert("NFT image must be 2 MB or less.");
      input.value = "";
      return;
    }

    mintableNfts[index].imageFile = file;
    mintableNfts[index].imagePreview = URL.createObjectURL(file);
    mintableNfts = [...mintableNfts];
  }

  function editTask(index: number) {
    const task = tasks[index];
    if (!task) return;
    creatingTaskType = task.type;
    editingTaskIndex = index;
    selectedTaskType = task.type;
  }

  function removeTask(index: number) {
    tasks = tasks.filter((_, i) => i !== index);
  }

  function addNftField() {
    nfts = [...nfts, { id: generateId(), contract: "", tokenId: "" }];
  }

  function removeNftField(index: number) {
    nfts = nfts.filter((_, i) => i !== index);
  }

  function updateNftField(index: number, field: "contract" | "tokenId", value: string) {
    nfts = nfts.map((nft, i) =>
      i === index
        ? {
            ...nft,
            [field]: value
          }
        : nft
    );
  }

  async function uploadAsset(file: File, kind: UploadKind): Promise<UploadedAsset> {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("kind", kind);

    const response = await fetch("/api/uploads/event-assets", {
      method: "POST",
      body: formData,
      credentials: "include"
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result) {
      const message = result?.error ?? "Failed to upload asset.";
      throw new Error(message);
    }

    return result as UploadedAsset;
  }

  function isFormValid() {
    const errors: string[] = [];

    if (!eventTitle.trim()) errors.push("Provide an event title");
    if (!eventDescription.trim()) errors.push("Provide an event description");
    if (!eventStartISO) errors.push("Set a start date and time");
    if (!eventEndISO) errors.push("Set an end date and time");
    if (scheduleError) errors.push(scheduleError);

    let winnersInt: number | null = null;
    if (numWinners) {
      winnersInt = Number(numWinners);
      if (!Number.isInteger(winnersInt) || winnersInt <= 0) {
        errors.push("Number of winners must be a positive integer when provided");
      }
    }

    if (tasks.length === 0) errors.push("Add at least one event task");

    if (bannerError) errors.push(bannerError);
    if (logoError) errors.push(logoError);
    if (!logoFile && !uploadedLogo) {
      errors.push("Upload a logo image (150 KB max).");
    }

    if (prizeType === "Token") {
      if (!selectedChain) {
        errors.push("Select a chain for the token prize");
      }

      if (!prizeAddress) {
        errors.push("Select or enter a prize token");
      }

      if (prizeAddress === "custom") {
        if (!customTokenSymbol.trim()) errors.push("Enter custom token symbol");
        if (!customTokenAddress.trim()) {
          errors.push("Enter custom token contract address");
        } else if (!isValidEthereumAddress(customTokenAddress.trim())) {
          errors.push("Custom token address is not a valid Ethereum address");
        }
        if (!customTokenDecimals.trim()) {
          errors.push("Enter custom token decimals");
        } else if (Number.isNaN(Number(customTokenDecimals)) || Number(customTokenDecimals) < 0) {
          errors.push("Token decimals must be a non-negative number");
        }
      }

      if (distributionType === "even") {
        if (!prizePool || Number(prizePool) <= 0) {
          errors.push("Enter a positive prize pool");
        } else {
          const token = availableTokens.find((t) => t.address === prizeAddress);
          if (token) {
            try {
              const amountWei = ethers.parseUnits(String(prizePool), token.decimals);
              if (winnersInt && winnersInt > 0) {
                const winnersBigInt = BigInt(winnersInt);
                if (amountWei % winnersBigInt !== 0n) {
                  errors.push(
                    `Prize pool must divide evenly among winners in ${token.symbol} smallest units`
                  );
                }
              }
            } catch (error) {
              errors.push("Invalid prize pool format for selected token");
            }
          }
        }
      } else if (distributionType === "custom") {
        if (positionRewards.length === 0) {
          errors.push("Enter rewards for each winner position");
        } else {
          let totalCustomRewards = 0;
          positionRewards.forEach((reward, i) => {
            if (!reward.amount || Number(reward.amount) <= 0) {
              errors.push(`Position #${i + 1}: Enter a positive reward amount`);
            } else {
              totalCustomRewards += Number(reward.amount);
            }
          });
          const token = availableTokens.find((t) => t.address === prizeAddress);
          if (token && totalCustomRewards > 0) {
            try {
              ethers.parseUnits(String(totalCustomRewards), token.decimals);
            } catch {
              errors.push("Total custom rewards exceed token precision");
            }
          }
        }
      }
    }

    if (prizeType === "ETH" && (!prizePool || Number(prizePool) <= 0)) {
      errors.push("Enter a positive native coin prize pool");
    }

    if (prizeType === "NFT") {
      if (nfts.length === 0) {
        errors.push("Add at least one NFT prize");
      } else {
        nfts.forEach((nft, i) => {
          if (!nft.contract.trim()) {
            errors.push(`NFT #${i + 1}: Enter contract address`);
          } else if (!isValidEthereumAddress(nft.contract.trim())) {
            errors.push(`NFT #${i + 1}: Invalid Ethereum contract address`);
          }
          if (!nft.tokenId.trim()) errors.push(`NFT #${i + 1}: Enter token ID`);
        });
        if (winnersInt && winnersInt > 0 && nfts.length % winnersInt !== 0) {
          errors.push("Number of NFTs must be divisible by number of winners");
        }
      }
    }

    if (prizeType === "MintableNFT") {
      if (mintableNfts.length === 0) {
        errors.push("Add at least one mintable NFT variant");
      } else {
        mintableNfts.forEach((nft, i) => {
          if (!nft.name.trim()) errors.push(`NFT #${i + 1}: Enter NFT name`);
          if (!nft.description.trim()) errors.push(`NFT #${i + 1}: Enter description`);
          if (!nft.supply.trim() || Number(nft.supply) <= 0) {
            errors.push(`NFT #${i + 1}: Enter a valid supply limit`);
          }
          if (!nft.imageFile && !nft.uploadedImage) {
            errors.push(`NFT #${i + 1}: Upload an NFT image`);
          }
        });
      }
    }

    validationErrors = errors;
    return errors.length === 0;
  }

  async function createEvent() {
    submitAttempted = true;
    validationErrors = [];
    uploadError = "";

    if (!isFormValid()) return;

    isSaving = true;

    try {
      let bannerAsset: UploadedAsset | null = uploadedBanner;
      if (bannerFile) {
        bannerAsset = await uploadAsset(bannerFile, "banner");
        uploadedBanner = bannerAsset;
      }

      let logoAsset: UploadedAsset | null = uploadedLogo;
      if (logoFile) {
        logoAsset = await uploadAsset(logoFile, "logo");
        uploadedLogo = logoAsset;
      }

      if (!logoAsset) {
        uploadError = "Logo upload failed. Please upload a logo to continue.";
        return;
      }

      // Upload mintable NFT images
      const mintableNftAssets = [];
      if (prizeType === "MintableNFT") {
        for (const nft of mintableNfts) {
          let nftImageAsset = nft.uploadedImage;
          if (nft.imageFile) {
            nftImageAsset = await uploadAsset(nft.imageFile, "nft");
          }
          mintableNftAssets.push({
            name: nft.name.trim(),
            description: nft.description.trim(),
            supply: Number(nft.supply),
            rarity: nft.rarity,
            image: nftImageAsset
          });
        }
      }

      const payload = {
        title: eventTitle.trim(),
        description: eventDescription.trim(),
        start_time: eventStartISO,
        end_time: eventEndISO,
        num_winners: numWinners ? Number(numWinners) : null,
        assets: {
          banner: bannerAsset,
          logo: logoAsset
        },
        tasks: tasks.map((task) => ({
          id: task.id,
          type: task.type,
          config: clone(task.config)
        })),
        prize_details: {
          type: prizeType,
          token_address: prizeType === "Token" ? prizeAddress : null,
          prize_pool: prizePool ? Number(prizePool) : null,
          distribution_type: prizeType === "Token" || prizeType === "ETH" ? distributionType : null,
          position_rewards:
            (prizeType === "Token" || prizeType === "ETH") && distributionType === "custom"
              ? positionRewards.map((r) => ({ position: r.position, amount: Number(r.amount) }))
              : null,
          chain:
            prizeType === "Token"
              ? {
                  id: selectedChain,
                  name: chainOptions.find((option) => option.id === selectedChain)?.label ?? selectedChain,
                  isCustom: false
                }
              : null,
          token_metadata:
            prizeType === "Token" && prizeAddress === "custom"
              ? {
                  symbol: customTokenSymbol.trim(),
                  address: customTokenAddress.trim(),
                  decimals: Number(customTokenDecimals)
                }
              : null,
          nfts:
            prizeType === "NFT"
              ? nfts.map(({ contract, tokenId }) => ({
                  contract: contract.trim(),
                  tokenId: tokenId.trim()
                }))
              : [],
          mintable_nfts:
            prizeType === "MintableNFT"
              ? mintableNftAssets
              : []
        }
      };

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        uploadError = errorBody?.error ?? "Failed to save event.";
        return;
      }

      const { id } = await response.json();

      eventTitle = "";
      eventDescription = "";
      startDate = "";
      startTime = "";
      endDate = "";
      endTime = "";
      eventStartISO = null;
      eventEndISO = null;
      scheduleError = "";
      numWinners = "";
      bannerFile = null;
      bannerPreview = "";
      logoFile = null;
      logoPreview = "";
      uploadedBanner = null;
      uploadedLogo = null;
      bannerError = "";
      logoError = "";
      tasks = [];
      prizeType = "";
      prizeAddress = "";
      prizePool = "";
      distributionType = "even";
      positionRewards = [];
      nfts = [];

      clearFormDraft();
      await goto("/dashboard", { replaceState: true });
    } catch (err) {
      uploadError = err instanceof Error ? err.message : "Failed to upload assets.";
    } finally {
      isSaving = false;
    }
  }
</script>

<section class="form-section">
  <form class="event-form" on:submit|preventDefault={createEvent}>
    <div class="form-block">
      <h2 class="section-title">Basic Event Details</h2>
      <p class="section-description">
        Provide an overview, timing, and hero artwork for your event. These details appear on the
        public event page.
      </p>

      <div class="form-group">
        <label for="event-title">Event title</label>
        <input
          id="event-title"
          type="text"
          placeholder="MoonFlux launch celebration"
          bind:value={eventTitle}
          required
        />
      </div>

      <div class="form-group">
        <label for="event-description">Description</label>
        <textarea
          id="event-description"
          rows="4"
          placeholder="Explain what participants need to do and any rewards on offer"
          bind:value={eventDescription}
          required
        ></textarea>
      </div>

      <div class="grid-two">
        <div class="form-group">
          <label for="start-date">Start date</label>
          <input id="start-date" type="date" bind:value={startDate} on:change={updateDateTimes} required />
        </div>
        <div class="form-group">
          <label for="start-time">Start time</label>
          <input id="start-time" type="time" bind:value={startTime} on:input={updateDateTimes} required />
        </div>
      </div>

      <div class="grid-two">
        <div class="form-group">
          <label for="end-date">End date</label>
          <input id="end-date" type="date" bind:value={endDate} on:change={updateDateTimes} required />
        </div>
        <div class="form-group">
          <label for="end-time">End time</label>
          <input id="end-time" type="time" bind:value={endTime} on:input={updateDateTimes} required />
        </div>
      </div>

      <div class="form-group single">
        <label for="num-winners">Number of winners (optional)</label>
        <input
          id="num-winners"
          type="number"
          min="1"
          step="1"
          placeholder="Leave blank if every eligible participant is rewarded"
          bind:value={numWinners}
        />
        <p class="field-hint">Leave empty when every qualifying participant receives the reward.</p>
      </div>

      <div class="form-group">
        <label for="banner-upload">Banner image</label>
        <p class="field-hint">Recommended size: 1600 × 600 px (wide hero format)</p>
        <div class="file-input">
          <input id="banner-upload" type="file" accept="image/*" on:change={handleBannerUpload} />
          <span>Upload banner image</span>
        </div>
        {#if bannerError}
          <p class="error-text">{bannerError}</p>
        {/if}
        {#if bannerPreview}
          <img class="banner-preview" src={bannerPreview} alt="Event banner preview" />
        {/if}
      </div>

      <div class="form-group">
        <label for="logo-upload">Event logo</label>
        <p class="field-hint">Recommended size: 480 × 480 px (square with transparent background)</p>
        <div class="file-input">
          <input id="logo-upload" type="file" accept="image/*" on:change={handleLogoUpload} />
          <span>Upload logo image</span>
        </div>
        {#if logoError}
          <p class="error-text">{logoError}</p>
        {/if}
        {#if logoPreview}
          <img class="logo-preview" src={logoPreview} alt="Event logo preview" />
        {/if}
      </div>
    </div>

    <div class="form-block">
      <h2 class="section-title">Add Event Tasks</h2>
      <p class="section-description">
        Mix and match multiple task categories. Each task can capture its own configuration through
        the modular task components.
      </p>

      <div class="grid-two">
        <div class="form-group">
          <label for="task-type">Select task type</label>
          <select id="task-type" bind:value={selectedTaskType}>
            <option disabled hidden value="">Choose task category</option>
            {#each taskOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>
        <div class="form-group align-end">
          <button type="button" class="ghost-btn" on:click={startCreateTask} disabled={!selectedTaskType}>
            + Add Task
          </button>
        </div>
      </div>

      {#if creatingTaskType}
        <div class="task-builder">
          <svelte:component
            this={taskRegistry[creatingTaskType].component}
            initialConfig={editingTaskIndex !== null ? clone(tasks[editingTaskIndex].config) : null}
            onSave={handleTaskSave}
            onCancel={handleTaskCancel}
          />
        </div>
      {/if}

      <div class="task-list">
        {#if tasks.length === 0}
          <p class="empty-state">No tasks added yet. Choose a task type and click “+ Add Task”.</p>
        {:else}
          {#each tasks as task, index (task.id)}
            <div class="task-card">
              <div class="task-card-header">
                <div>
                  <p class="task-label">{getTaskLabel(task.type)}</p>
                  <p class="task-meta">Task #{index + 1}</p>
                </div>
                <div class="task-actions">
                  <button type="button" class="ghost-btn" on:click={() => editTask(index)}>Edit</button>
                  <button type="button" class="ghost-btn danger" on:click={() => removeTask(index)}>
                    Remove
                  </button>
                </div>
              </div>
              <pre class="task-config">{summariseConfig(task.config)}</pre>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <div class="form-block">
      <h2 class="section-title">Prize Configuration</h2>
      <p class="section-description">
        Detail the exact reward mechanics that will be enforced by smart contracts or backend logic.
      </p>

      <div class="form-group">
        <label for="prize-type-detail">Detailed prize type</label>
        <select id="prize-type-detail" bind:value={prizeType} required>
          <option disabled hidden value="">Select prize type</option>
          {#each detailedPrizeOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>

      {#if prizeType === "Token"}
        <div class="form-group">
          <label for="prize-chain">Token chain</label>
          <select id="prize-chain" bind:value={selectedChain}>
            <option disabled hidden value="">Select chain</option>
            {#each chainOptions as option}
              <option value={option.id}>{option.label}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="prize-token">Prize token</label>
          <select id="prize-token" bind:value={prizeAddress} on:change={handleTokenSelect}>
            <option disabled hidden value="">Select token</option>
            {#each availableTokens as token}
              <option value={token.address}>
                {token.symbol} ({token.decimals} decimals)
              </option>
            {/each}
            <option value="custom">Add custom token…</option>
          </select>
        </div>

        <div class="form-group">
          <label for="distribution-type">Reward distribution</label>
          <select id="distribution-type" bind:value={distributionType}>
            <option value="even">Even split among winners</option>
            <option value="custom">Custom amount per position</option>
          </select>
          <p class="field-hint">
            {distributionType === "even" 
              ? "Prize pool will be divided equally among all winners" 
              : "Specify exact reward for each winner position (1st, 2nd, 3rd, etc.)"}
          </p>
        </div>

        {#if distributionType === "even"}
          <div class="form-group">
            <label for="token-prize-pool">Total prize pool</label>
            <input
              id="token-prize-pool"
              type="number"
              min="0"
              step="any"
              bind:value={prizePool}
              required
            />
          </div>
        {:else if distributionType === "custom" && numWinners && Number(numWinners) > 0}
          <div class="form-group">
            <label>Position-based rewards (max 10 winners)</label>
            <p class="field-hint">Enter the reward amount for each winner position</p>
            <div class="position-rewards-list">
              {#each positionRewards as reward (reward.position)}
                <div class="position-reward-row">
                  <span class="position-label">#{reward.position}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Amount"
                    bind:value={reward.amount}
                    required
                  />
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if prizeAddress === "custom"}
          <div class="grid-two">
            <div class="form-group">
              <label for="custom-token-symbol">Token symbol</label>
              <input
                id="custom-token-symbol"
                type="text"
                placeholder="e.g. MYT"
                bind:value={customTokenSymbol}
              />
            </div>
            <div class="form-group">
              <label for="custom-token-decimals">Token decimals</label>
              <input
                id="custom-token-decimals"
                type="number"
                min="0"
                step="1"
                bind:value={customTokenDecimals}
              />
            </div>
          </div>
          <div class="form-group">
            <label for="custom-token-address">Token contract address</label>
            <input
              id="custom-token-address"
              type="text"
              placeholder="0x..."
              bind:value={customTokenAddress}
            />
          </div>
        {/if}
      {/if}

      {#if prizeType === "ETH"}
        <div class="form-group">
          <label for="distribution-type-eth">Reward distribution</label>
          <select id="distribution-type-eth" bind:value={distributionType}>
            <option value="even">Even split among winners</option>
            <option value="custom">Custom amount per position</option>
          </select>
          <p class="field-hint">
            {distributionType === "even" 
              ? "Prize pool will be divided equally among all winners" 
              : "Specify exact reward for each winner position (1st, 2nd, 3rd, etc.)"}
          </p>
        </div>

        {#if distributionType === "even"}
          <div class="form-group">
            <label for="native-prize-pool">Total prize pool (ETH)</label>
            <input id="native-prize-pool" type="number" min="0" step="any" bind:value={prizePool} required />
          </div>
        {:else if distributionType === "custom" && numWinners && Number(numWinners) > 0}
          <div class="form-group">
            <label>Position-based rewards (max 10 winners)</label>
            <p class="field-hint">Enter the ETH reward amount for each winner position</p>
            <div class="position-rewards-list">
              {#each positionRewards as reward (reward.position)}
                <div class="position-reward-row">
                  <span class="position-label">#{reward.position}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="ETH amount"
                    bind:value={reward.amount}
                    required
                  />
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {/if}

      {#if prizeType === "NFT"}
        <div class="form-group">
          <div class="group-header">
            <h3>NFT prizes</h3>
            <button type="button" class="ghost-btn" on:click={addNftField}>+ Add NFT</button>
          </div>
          <div class="nft-list">
            {#each nfts as nft, index (nft.id)}
              <div class="nft-row">
                <input
                  type="text"
                  placeholder="Contract address"
                  bind:value={nft.contract}
                  on:input={(e) => updateNftField(index, "contract", (e.currentTarget as HTMLInputElement).value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Token ID"
                  bind:value={nft.tokenId}
                  on:input={(e) => updateNftField(index, "tokenId", (e.currentTarget as HTMLInputElement).value)}
                  required
                />
                <button type="button" class="ghost-btn danger" on:click={() => removeNftField(index)}>
                  Remove
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if prizeType === "MintableNFT"}
        <div class="form-group">
          <div class="group-header">
            <h3>Mintable NFT Variants</h3>
            <button type="button" class="ghost-btn" on:click={addMintableNft}>+ Add NFT Variant</button>
          </div>
          <p class="field-hint">Add one or more NFT variants that participants can mint after completing tasks</p>
          <div class="mintable-nft-list">
            {#each mintableNfts as nft, index (nft.id)}
              <div class="mintable-nft-card">
                <div class="mintable-nft-header">
                  <h4>NFT Variant #{index + 1}</h4>
                  {#if mintableNfts.length > 1}
                    <button type="button" class="ghost-btn danger small" on:click={() => removeMintableNft(index)}>
                      Remove
                    </button>
                  {/if}
                </div>

                <div class="grid-two">
                  <div class="form-group">
                    <label for="nft-name-{index}">NFT Name</label>
                    <input
                      id="nft-name-{index}"
                      type="text"
                      placeholder="e.g. Golden Badge"
                      bind:value={nft.name}
                      required
                    />
                  </div>
                  <div class="form-group">
                    <label for="nft-rarity-{index}">Rarity</label>
                    <select id="nft-rarity-{index}" bind:value={nft.rarity}>
                      <option value="Common">Common</option>
                      <option value="Uncommon">Uncommon</option>
                      <option value="Rare">Rare</option>
                      <option value="Epic">Epic</option>
                      <option value="Legendary">Legendary</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label for="nft-description-{index}">Description</label>
                  <textarea
                    id="nft-description-{index}"
                    placeholder="Describe this NFT variant..."
                    bind:value={nft.description}
                    rows="3"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="nft-supply-{index}">Supply Limit</label>
                  <input
                    id="nft-supply-{index}"
                    type="number"
                    min="1"
                    placeholder="Max number that can be minted"
                    bind:value={nft.supply}
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="nft-image-{index}">NFT Image (max 2MB)</label>
                  <input
                    id="nft-image-{index}"
                    type="file"
                    accept="image/*"
                    on:change={(e) => handleMintableNftImageUpload(index, e)}
                    required={!nft.uploadedImage}
                  />
                  {#if nft.imagePreview}
                    <img src={nft.imagePreview} alt="NFT preview" class="nft-image-preview" />
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <div class="form-group readonly">
        <label>Reward distribution summary</label>
        <input
          type="text"
          value={
            prizeType === "Token" && numWinners
              ? `${Number(prizePool || 0) / Number(numWinners)} ${
                  availableTokens.find((t) => t.address === prizeAddress)?.symbol ?? "tokens"
                } each`
              : prizeType === "ETH" && numWinners
              ? `${Number(prizePool || 0) / Number(numWinners)} ETH each`
              : prizeType === "NFT" && numWinners
              ? `${nfts.length} NFT prize${nfts.length === 1 ? "" : "s"}`
              : prizeType === "MintableNFT"
              ? `${mintableNfts.length} NFT variant${mintableNfts.length === 1 ? "" : "s"} - participants mint after tasks`
              : numWinners
              ? "—"
              : "All eligible participants rewarded"
          }
          readonly
        />
      </div>
    </div>

    <button type="submit" class="primary-btn" disabled={isSaving}>
      {isSaving ? "Saving..." : "Create Event"}
    </button>

    {#if uploadError}
      <div class="upload-error">{uploadError}</div>
    {/if}

    {#if submitAttempted && validationErrors.length}
      <div class="validation-errors">
        <h3>Resolve the following</h3>
        <ul>
          {#each validationErrors as err}
            <li>{err}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </form>
</section>

<style>
  .form-section {
    max-width: 980px;
    margin: 0 auto;
    padding: 2.5rem 1.75rem 3rem;
    background: rgba(8, 9, 20, 0.96);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 28px 60px rgba(0, 0, 0, 0.45);
  }

  .event-form {
    display: flex;
    flex-direction: column;
    gap: 2.25rem;
    color: #f2f3ff;
  }

  .form-block {
    display: flex;
    flex-direction: column;
    gap: 1.35rem;
    background: rgba(18, 20, 38, 0.82);
    border-radius: 18px;
    padding: 1.75rem 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.07);
  }

  .section-title {
    margin: 0;
    font-size: 1.32rem;
    font-weight: 700;
  }

  .section-description {
    margin: -0.25rem 0 0;
    color: rgba(242, 243, 255, 0.78);
    font-size: 0.95rem;
    line-height: 1.6;
  }

  .grid-two {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.2rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .form-group.align-end {
    justify-content: flex-end;
  }

  .form-group.readonly input {
    background: rgba(26, 28, 45, 0.45);
    cursor: not-allowed;
  }

  .helper-text {
    font-size: 0.8rem;
    color: rgba(243, 243, 255, 0.55);
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
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  textarea {
    min-height: 140px;
    resize: vertical;
  }

  input:focus,
  textarea:focus,
  select:focus {
    outline: none;
    border-color: #6fa0ff;
    box-shadow: 0 0 0 3px rgba(111, 160, 255, 0.18);
  }

  .file-input {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.7rem;
    background: rgba(26, 28, 45, 0.72);
    border: 1px dashed rgba(255, 255, 255, 0.18);
    border-radius: 12px;
    padding: 0.85rem 1.2rem;
    cursor: pointer;
    width: fit-content;
  }

  .file-input input {
    position: absolute;
    inset: 0;
    opacity: 0;
  }

  .file-input span {
    pointer-events: none;
    font-weight: 600;
    color: rgba(242, 243, 255, 0.85);
  }

  .field-hint {
    margin: 0.3rem 0 0;
    color: rgba(242, 243, 255, 0.7);
    font-size: 0.85rem;
  }

  .banner-preview {
    margin-top: 0.75rem;
    max-height: 200px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.06);
    padding: 0.6rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    object-fit: cover;
  }

  .logo-preview {
    margin-top: 0.75rem;
    max-height: 140px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.06);
    padding: 0.6rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    object-fit: cover;
  }

  .task-builder {
    background: rgba(12, 14, 30, 0.9);
    border-radius: 14px;
    padding: 1.25rem 1.1rem;
  }

  .task-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .empty-state {
    margin: 0;
    color: rgba(243, 243, 255, 0.6);
  }

  .task-card {
    background: rgba(12, 14, 30, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    padding: 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .task-card-header {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: center;
  }

  .task-label {
    margin: 0;
    font-weight: 600;
  }

  .task-meta {
    margin: 0.2rem 0 0;
    font-size: 0.85rem;
    color: rgba(243, 243, 255, 0.6);
  }

  .task-actions {
    display: flex;
    gap: 0.6rem;
  }

  .task-config {
    margin: 0;
    padding: 0.85rem;
    background: rgba(8, 9, 22, 0.85);
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 0.85rem;
    max-height: 220px;
    overflow: auto;
    white-space: pre-wrap;
  }

  .ghost-btn {
    padding: 0.55rem 1rem;
    background: rgba(111, 160, 255, 0.12);
    color: #8da9ff;
    border: 1px solid rgba(111, 160, 255, 0.22);
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
  }

  .ghost-btn:hover {
    opacity: 0.85;
  }

  .ghost-btn.danger {
    background: rgba(218, 30, 40, 0.12);
    border-color: rgba(218, 30, 40, 0.3);
    color: #ff9b9b;
  }

  .primary-btn {
    align-self: flex-start;
    padding: 0.85rem 2.1rem;
    background: linear-gradient(135deg, #6fa0ff, #9c7bff);
    color: #fff;
    border: none;
    border-radius: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.15s ease, opacity 0.15s ease;
  }

  .primary-btn:hover {
    transform: translateY(-1px);
    opacity: 0.94;
  }

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
  }

  .nft-list {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .nft-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) auto;
    gap: 0.75rem;
    align-items: center;
  }

  .position-rewards-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 400px;
    overflow-y: auto;
    padding: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.2);
  }

  .position-reward-row {
    display: grid;
    grid-template-columns: 60px 1fr;
    gap: 0.75rem;
    align-items: center;
  }

  .position-label {
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    text-align: center;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    font-size: 0.95rem;
  }

  .mintable-nft-list {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    margin-top: 1rem;
  }

  .mintable-nft-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    padding: 1.25rem;
  }

  .mintable-nft-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .mintable-nft-header h4 {
    margin: 0;
    font-size: 1.05rem;
    color: rgba(255, 255, 255, 0.95);
  }

  .ghost-btn.small {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
  }

  .nft-image-preview {
    margin-top: 0.75rem;
    max-height: 200px;
    max-width: 100%;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    object-fit: contain;
  }

  .validation-errors {
    background: rgba(218, 30, 40, 0.12);
    border: 1px solid rgba(218, 30, 40, 0.32);
    border-radius: 12px;
    padding: 1rem 1.25rem;
    color: #ffb4b4;
  }

  .validation-errors h3 {
    margin: 0 0 0.6rem;
    font-size: 1rem;
  }

  .validation-errors ul {
    margin: 0;
    padding-left: 1.25rem;
  }

  @media (max-width: 720px) {
    .form-section {
      padding: 1.9rem 1.25rem 2.4rem;
    }

    .form-block {
      padding: 1.35rem 1.2rem;
    }

    .task-card-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .task-actions {
      width: 100%;
    }

    .nft-row {
      grid-template-columns: 1fr;
    }
  }
</style>
