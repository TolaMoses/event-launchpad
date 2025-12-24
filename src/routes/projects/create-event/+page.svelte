<script context="module" lang="ts">
  export const ssr = false;
</script>

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
  import RewardBuilder from "$lib/components/RewardBuilder.svelte";

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
    rarityPercentage: string;
    uploadedImage: UploadedAsset | null;
  };

  type NftDistributionPosition = {
    position: number;
    nftId: string; // references nft.id or mintableNft.id
  };

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

  const registryEntries = Object.entries(taskRegistry) as [TaskTypeKey, TaskRegistryEntry][];

  const taskOptions = registryEntries
    .filter(([key]) => key !== "irl")
    .map(([value, entry]) => ({ value, label: entry.label }));

  const detailedPrizeOptions: { value: string; label: string }[] = [
    { value: "Token", label: "Token" },
    { value: "ETH", label: "Native coin" },
    { value: "NFT", label: "Existing NFT" },
    { value: "MintableNFT", label: "Mintable NFT (participants mint after tasks)" },
    { value: "Gift", label: "Gift/Merch (physical items shipped to winners)" },
    { value: "Voucher", label: "Voucher/Code (digital codes sent to winners)" },
    { value: "CustomPoints", label: "Custom Points (point-based reward system)" }
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

  let eventType: "quick_event" | "community" | "" = "";
  let eventTitle = "";
  let eventDescription = "";
  let startDate = "";
  let startTime = "";
  let endDate = "";
  let endTime = "";
  let eventStartISO: string | null = null;
  let eventEndISO: string | null = null;
  let scheduleError = "";
  
  // Auto-scroll to form when event type is selected
  $: if (eventType && browser) {
    setTimeout(() => {
      const formSection = document.querySelector('.form-block');
      if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

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
  
  // Discord bot setup
  let discordBotSetup: {
    connected: boolean;
    selectedGuildId: string | null;
    selectedGuildName: string | null;
    botAdded: boolean;
    guilds: Array<{ id: string; name: string; owner: boolean; permissions: string }>;
  } = {
    connected: false,
    selectedGuildId: null,
    selectedGuildName: null,
    botAdded: false,
    guilds: []
  };
  let checkingDiscordBot = false;

  // Rewards array - replaces single prizeType
  let rewards: RewardConfig[] = [];
  let selectedRewardType = "";
  let editingRewardId: string | null = null;

  // Legacy variables kept for backward compatibility during migration
  let maxTickets = "";
  let videoUrl = "";
  let availableTokens: { symbol: string; address: string; decimals: number }[] = [];
  let selectedChain = "";
  let voucherCodeInput = "";

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
      rarityPercentage: "100",
      uploadedImage: null
    }];
  }

  $: if (prizeType === "NFT" && nftDistributionType === "custom" && numWinners) {
    const count = Math.min(Number(numWinners) || 0, 10);
    if (nftPositionDistribution.length !== count) {
      nftPositionDistribution = Array.from({ length: count }, (_, i) => ({
        position: i + 1,
        nftId: nftPositionDistribution[i]?.nftId || ""
      }));
    }
  }

  $: if (prizeType === "MintableNFT" && mintableNftDistributionType === "custom" && numWinners) {
    const count = Math.min(Number(numWinners) || 0, 10);
    if (mintableNftPositionDistribution.length !== count) {
      mintableNftPositionDistribution = Array.from({ length: count }, (_, i) => ({
        position: i + 1,
        nftId: mintableNftPositionDistribution[i]?.nftId || ""
      }));
    }
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
      nftDistributionType,
      nftPositionDistribution,
      mintableNfts: mintableNfts.map(n => ({
        id: n.id,
        name: n.name,
        description: n.description,
        supply: n.supply,
        rarity: n.rarity,
        rarityPercentage: n.rarityPercentage,
        imagePreview: n.imagePreview
      })),
      mintableNftDistributionType,
      mintableNftPositionDistribution,
      giftDescription,
      giftValue,
      voucherDescription,
      voucherCodes,
      videoUrl,
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
      nftDistributionType = draft.nftDistributionType || "even";
      nftPositionDistribution = draft.nftPositionDistribution || [];
      mintableNfts = (draft.mintableNfts || []).map((n: any) => ({
        ...n,
        imageFile: null,
        uploadedImage: null
      }));
      mintableNftDistributionType = draft.mintableNftDistributionType || "random";
      mintableNftPositionDistribution = draft.mintableNftPositionDistribution || [];
      giftDescription = draft.giftDescription || "";
      giftValue = draft.giftValue || "";
      voucherDescription = draft.voucherDescription || "";
      voucherCodes = draft.voucherCodes || [];
      videoUrl = draft.videoUrl || "";
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

  function handleBeforeUnload() {
    // Persist the most recent state synchronously before navigation/reload
    try { saveFormDraft(); } catch { /* no-op */ }
  }

  $: if (browser && (eventTitle || eventDescription || startDate || prizeType)) {
    triggerAutosave();
  }

  onMount(() => {
    loadFormDraft();
    checkDiscordConnection();
    // Ensure we don't lose the latest edits when navigating away (e.g., Discord OAuth)
    if (browser) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
  });

  // Discord bot setup functions
  async function checkDiscordConnection() {
    try {
      const response = await fetch('/api/auth/discord/status');
      if (response.ok) {
        const data = await response.json();
        discordBotSetup.connected = data.connected;
        discordBotSetup.guilds = data.guilds || [];
      }
    } catch (err) {
      console.error('Failed to check Discord connection:', err);
    }
  }

  function connectDiscord() {
    if (!browser) return;
    const currentUrl = window.location.href;
    // Persist draft before the hard redirect to Discord OAuth
    saveFormDraft();
    window.location.href = `/api/auth/discord/connect?returnTo=${encodeURIComponent(currentUrl)}`;
  }

  function selectDiscordGuild(guildId: string, guildName: string) {
    discordBotSetup.selectedGuildId = guildId;
    discordBotSetup.selectedGuildName = guildName;
    discordBotSetup.botAdded = false; // Reset bot added status when changing guild
  }

  async function getBotInviteUrl(): Promise<string> {
    try {
      const res = await fetch('/api/config/discord-bot');
      const data = await res.json().catch(() => ({}));
      const botClientId: string | undefined = data.clientId;
      if (!botClientId) {
        console.error('DISCORD_CLIENT_ID not configured');
        return '';
      }
      const permissions = '268437504'; // Read Members + Read Messages
      const guildId = discordBotSetup.selectedGuildId;
      return `https://discord.com/oauth2/authorize?client_id=${botClientId}&permissions=${permissions}&scope=bot${guildId ? `&guild_id=${guildId}` : ''}`;
    } catch (err) {
      console.error('Failed to build Discord bot invite URL', err);
      return '';
    }
  }

  async function addBotToServer() {
    if (!discordBotSetup.selectedGuildId) return;
    if (!browser) return;
    const inviteUrl = await getBotInviteUrl();
    if (!inviteUrl) {
      alert('Discord Bot Client ID is not configured.');
      return;
    }
    window.open(inviteUrl, '_blank', 'noopener');
  }

  async function verifyBotAdded() {
    if (!discordBotSetup.selectedGuildId) return;

    checkingDiscordBot = true;
    try {
      const response = await fetch('/api/auth/discord/verify-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId: discordBotSetup.selectedGuildId })
      });

      if (response.ok) {
        const data = await response.json();
        discordBotSetup.botAdded = data.botInGuild;
        if (!data.botInGuild) {
          alert('Bot not found in server. Please make sure you added the bot and try again.');
        }
      }
    } catch (err) {
      console.error('Failed to verify bot:', err);
      alert('Failed to verify bot. Please try again.');
    } finally {
      checkingDiscordBot = false;
    }
  }

  // Check if Discord tasks require bot setup
  $: hasDiscordTask = tasks.some(task => task.type === 'discord');
  $: discordSetupComplete = !hasDiscordTask || (discordBotSetup.connected && discordBotSetup.selectedGuildId && discordBotSetup.botAdded);
  $: canSubmitForm = discordSetupComplete;

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
    if (browser) {
      if (bannerPreview) {
        URL.revokeObjectURL(bannerPreview);
      }
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
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

  // Reward management functions
  function addReward() {
    if (!selectedRewardType) return;
    
    const newReward: RewardConfig = {
      id: generateId(),
      type: selectedRewardType
    };

    // Initialize type-specific defaults
    if (selectedRewardType === "Token" || selectedRewardType === "ETH") {
      newReward.distributionType = "even";
      newReward.positionRewards = [];
      newReward.prizePool = "";
      if (selectedRewardType === "Token") {
        newReward.chain = selectedChain || "";
        newReward.tokenAddress = "";
      }
    } else if (selectedRewardType === "NFT") {
      newReward.nfts = [{ id: generateId(), contract: "", tokenId: "" }];
      newReward.nftDistributionType = "even";
      newReward.nftPositionDistribution = [];
    } else if (selectedRewardType === "MintableNFT") {
      newReward.mintableNfts = [{
        id: generateId(),
        name: "",
        description: "",
        imageFile: null,
        imagePreview: "",
        supply: "",
        rarity: "Common",
        rarityPercentage: "100",
        uploadedImage: null
      }];
      newReward.mintableNftDistributionType = "random";
      newReward.mintableNftPositionDistribution = [];
    } else if (selectedRewardType === "Gift") {
      newReward.giftDescription = "";
      newReward.giftValue = "";
    } else if (selectedRewardType === "Voucher") {
      newReward.voucherDescription = "";
      newReward.voucherCodes = [];
    } else if (selectedRewardType === "CustomPoints") {
      newReward.customPointName = "";
      newReward.leaderboardEnabled = false;
    }

    rewards = [...rewards, newReward];
    editingRewardId = newReward.id;
    selectedRewardType = "";
  }

  function removeReward(id: string) {
    // Clean up any image previews for mintable NFTs
    const reward = rewards.find(r => r.id === id);
    if (reward?.mintableNfts) {
      reward.mintableNfts.forEach(nft => {
        if (nft.imagePreview) {
          URL.revokeObjectURL(nft.imagePreview);
        }
      });
    }
    rewards = rewards.filter(r => r.id !== id);
    if (editingRewardId === id) {
      editingRewardId = null;
    }
  }

  function editReward(id: string) {
    editingRewardId = editingRewardId === id ? null : id;
  }

  function getRewardLabel(reward: RewardConfig): string {
    const option = detailedPrizeOptions.find(opt => opt.value === reward.type);
    return option?.label || reward.type;
  }

  function getRewardSummary(reward: RewardConfig): string {
    switch (reward.type) {
      case "Token":
        return reward.prizePool ? `${reward.prizePool} tokens` : "Token reward";
      case "ETH":
        return reward.prizePool ? `${reward.prizePool} ETH` : "ETH reward";
      case "NFT":
        return reward.nfts ? `${reward.nfts.length} NFT${reward.nfts.length === 1 ? "" : "s"}` : "NFT reward";
      case "MintableNFT":
        return reward.mintableNfts ? `${reward.mintableNfts.length} variant${reward.mintableNfts.length === 1 ? "" : "s"}` : "Mintable NFT";
      case "Gift":
        return reward.giftValue ? `Gift ($${reward.giftValue})` : "Gift/Merch";
      case "Voucher":
        return reward.voucherCodes ? `${reward.voucherCodes.length} code${reward.voucherCodes.length === 1 ? "" : "s"}` : "Voucher codes";
      case "CustomPoints":
        return reward.customPointName ? `${reward.customPointName} points` : "Custom points";
      default:
        return reward.type;
    }
  }

  // Helper functions for reward-specific operations
  function addNftToReward(rewardId: string) {
    rewards = rewards.map(r => {
      if (r.id === rewardId && r.nfts) {
        return { ...r, nfts: [...r.nfts, { id: generateId(), contract: "", tokenId: "" }] };
      }
      return r;
    });
  }

  function removeNftFromReward(rewardId: string, nftIndex: number) {
    rewards = rewards.map(r => {
      if (r.id === rewardId && r.nfts) {
        return { ...r, nfts: r.nfts.filter((_, i) => i !== nftIndex) };
      }
      return r;
    });
  }

  function addMintableNftToReward(rewardId: string) {
    rewards = rewards.map(r => {
      if (r.id === rewardId && r.mintableNfts) {
        const defaultPercentage = r.mintableNfts.length === 0 ? "100" : "0";
        return {
          ...r,
          mintableNfts: [
            ...r.mintableNfts,
            {
              id: generateId(),
              name: "",
              description: "",
              imageFile: null,
              imagePreview: "",
              supply: "",
              rarity: "Common",
              rarityPercentage: defaultPercentage,
              uploadedImage: null
            }
          ]
        };
      }
      return r;
    });
  }

  function removeMintableNftFromReward(rewardId: string, nftIndex: number) {
    rewards = rewards.map(r => {
      if (r.id === rewardId && r.mintableNfts) {
        const nft = r.mintableNfts[nftIndex];
        if (nft?.imagePreview) {
          URL.revokeObjectURL(nft.imagePreview);
        }
        return { ...r, mintableNfts: r.mintableNfts.filter((_, i) => i !== nftIndex) };
      }
      return r;
    });
  }

  function handleMintableNftImageUploadForReward(rewardId: string, nftIndex: number, event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    rewards = rewards.map(r => {
      if (r.id === rewardId && r.mintableNfts) {
        const nft = r.mintableNfts[nftIndex];
        if (nft.imagePreview) {
          URL.revokeObjectURL(nft.imagePreview);
        }

        if (!file) {
          r.mintableNfts[nftIndex].imageFile = null;
          r.mintableNfts[nftIndex].imagePreview = "";
          return { ...r, mintableNfts: [...r.mintableNfts] };
        }

        const MAX_NFT_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
        if (file.size > MAX_NFT_IMAGE_SIZE) {
          alert("NFT image must be 2 MB or less.");
          input.value = "";
          return r;
        }

        r.mintableNfts[nftIndex].imageFile = file;
        r.mintableNfts[nftIndex].imagePreview = URL.createObjectURL(file);
        return { ...r, mintableNfts: [...r.mintableNfts] };
      }
      return r;
    });
  }

  function addVoucherCodeToReward(rewardId: string, code: string) {
    if (!code.trim()) return;
    rewards = rewards.map(r => {
      if (r.id === rewardId && r.voucherCodes) {
        return { ...r, voucherCodes: [...r.voucherCodes, code.trim()] };
      }
      return r;
    });
  }

  function removeVoucherCodeFromReward(rewardId: string, codeIndex: number) {
    rewards = rewards.map(r => {
      if (r.id === rewardId && r.voucherCodes) {
        return { ...r, voucherCodes: r.voucherCodes.filter((_, i) => i !== codeIndex) };
      }
      return r;
    });
  }

  // Legacy functions - kept for backward compatibility
  function addNftField() {
    // No-op - replaced by addNftToReward
  }

  function removeNftField(index: number) {
    // No-op - replaced by removeNftFromReward
  }

  function updateNftField(index: number, field: "contract" | "tokenId", value: string) {
    // No-op - direct binding now used
  }

  function removeMintableNft(index: number) {
    // No-op - replaced by removeMintableNftFromReward
  }

  function handleMintableNftImageUpload(index: number, event: Event) {
    // No-op - replaced by handleMintableNftImageUploadForReward
  }

  function addVoucherCode() {
    // No-op - replaced by addVoucherCodeToReward
  }

  function removeVoucherCode(index: number) {
    // No-op - replaced by removeVoucherCodeFromReward
  }

  function oldAddNftField() {
    nfts = [...nfts, { id: generateId(), contract: "", tokenId: "" }];
  }

  function oldRemoveNftField(index: number) {
    nfts = nfts.filter((_, i) => i !== index);
  }

  function oldUpdateNftField(index: number, field: "contract" | "tokenId", value: string) {
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

    if (!eventType) errors.push("Select an event type (Quick Event or Community)");
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

    if (eventType === "quick_event" && tasks.length === 0) {
      errors.push("Add at least one event task");
    }

    if (bannerError) errors.push(bannerError);
    if (logoError) errors.push(logoError);
    if (!logoFile && !uploadedLogo) {
      errors.push("Upload a logo image (150 KB max).");
    }

    if (eventType === "quick_event" && rewards.length === 0) {
      errors.push("Add at least one reward for your event");
    }

    rewards.forEach((reward, index) => {
      const label = getRewardLabel(reward) || `Reward #${index + 1}`;

      if (reward.type === "Token") {
        if (!reward.chain) {
          errors.push(`${label}: Select a chain`);
        }
        if (!reward.tokenAddress) {
          errors.push(`${label}: Select a token`);
        }
        if (reward.tokenAddress === "custom") {
          if (!reward.customTokenSymbol?.trim()) {
            errors.push(`${label}: Enter custom token symbol`);
          }
          if (!reward.customTokenAddress?.trim()) {
            errors.push(`${label}: Enter custom token address`);
          } else if (!isValidEthereumAddress(reward.customTokenAddress.trim())) {
            errors.push(`${label}: Custom token address is not valid`);
          }
          if (!reward.customTokenDecimals?.trim()) {
            errors.push(`${label}: Enter token decimals`);
          } else if (Number.isNaN(Number(reward.customTokenDecimals)) || Number(reward.customTokenDecimals) < 0) {
            errors.push(`${label}: Token decimals must be non-negative`);
          }
        }

        if (reward.distributionType === "even") {
          if (!reward.prizePool || Number(reward.prizePool) <= 0) {
            errors.push(`${label}: Enter a positive prize pool`);
          }
        } else if (reward.distributionType === "custom") {
          const totalPositions = reward.positionRewards?.length || 0;
          const filled = reward.positionRewards?.filter((pos) => pos.amount && Number(pos.amount) > 0).length || 0;
          if (totalPositions === 0) {
            errors.push(`${label}: Add rewards for each winner position`);
          } else if (filled < totalPositions) {
            errors.push(`${label}: Fill in all position-based rewards`);
          }
        }
      }

      if (reward.type === "ETH") {
        if (reward.distributionType === "even") {
          if (!reward.prizePool || Number(reward.prizePool) <= 0) {
            errors.push(`${label}: Enter a positive ETH prize pool`);
          }
        } else if (reward.distributionType === "custom") {
          const totalPositions = reward.positionRewards?.length || 0;
          const filled = reward.positionRewards?.filter((pos) => pos.amount && Number(pos.amount) > 0).length || 0;
          if (totalPositions === 0) {
            errors.push(`${label}: Add rewards for each winner position`);
          } else if (filled < totalPositions) {
            errors.push(`${label}: Fill in all position-based rewards`);
          }
        }
      }

      if (reward.type === "NFT") {
        if (!reward.nfts || reward.nfts.length === 0) {
          errors.push(`${label}: Add at least one NFT`);
        } else {
          reward.nfts.forEach((nft, nftIndex) => {
            if (!nft.contract.trim()) {
              errors.push(`${label} - NFT #${nftIndex + 1}: Enter contract address`);
            } else if (!isValidEthereumAddress(nft.contract.trim())) {
              errors.push(`${label} - NFT #${nftIndex + 1}: Invalid contract address`);
            }
            if (!nft.tokenId.trim()) {
              errors.push(`${label} - NFT #${nftIndex + 1}: Enter token ID`);
            }
          });
        }
      }

      if (reward.type === "MintableNFT") {
        if (!reward.mintableNfts || reward.mintableNfts.length === 0) {
          errors.push(`${label}: Add at least one NFT variant`);
        } else {
          reward.mintableNfts.forEach((nft, variantIndex) => {
            if (!nft.name.trim()) errors.push(`${label} - Variant #${variantIndex + 1}: Enter name`);
            if (!nft.description.trim()) errors.push(`${label} - Variant #${variantIndex + 1}: Enter description`);
            if (!nft.supply.trim() || Number(nft.supply) <= 0) {
              errors.push(`${label} - Variant #${variantIndex + 1}: Enter valid supply`);
            }
            if (!nft.imageFile && !nft.uploadedImage) {
              errors.push(`${label} - Variant #${variantIndex + 1}: Upload an image`);
            }
          });

          if (reward.mintableNftDistributionType === "random" && reward.mintableNfts.length > 1) {
            let totalPercentage = 0;
            reward.mintableNfts.forEach((nft, variantIndex) => {
              const pct = Number(nft.rarityPercentage);
              if (!nft.rarityPercentage.trim() || Number.isNaN(pct) || pct < 0 || pct > 100) {
                errors.push(`${label} - Variant #${variantIndex + 1}: Rarity percentage must be 0-100`);
              } else {
                totalPercentage += pct;
              }
            });
            if (Math.abs(totalPercentage - 100) > 0.01) {
              errors.push(`${label}: Total rarity percentages must equal 100% (currently ${totalPercentage.toFixed(1)}%)`);
            }
          }
        }
      }

      if (reward.type === "Gift") {
        if (!reward.giftDescription?.trim()) {
          errors.push(`${label}: Enter gift description`);
        }
        if (!reward.giftValue || Number(reward.giftValue) <= 0) {
          errors.push(`${label}: Enter estimated value`);
        }
      }

      if (reward.type === "Voucher") {
        if (!reward.voucherDescription?.trim()) {
          errors.push(`${label}: Enter voucher description`);
        }
        if (!reward.voucherCodes || reward.voucherCodes.length === 0) {
          errors.push(`${label}: Add at least one voucher code`);
        }
        if (winnersInt && winnersInt > 0 && reward.voucherCodes && reward.voucherCodes.length < winnersInt) {
          errors.push(`${label}: Need at least ${winnersInt} codes (currently ${reward.voucherCodes.length})`);
        }
      }

      if (reward.type === "CustomPoints") {
        if (!reward.customPointName?.trim()) {
          errors.push(`${label}: Enter a point name`);
        }
      }
    });

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
            id: nft.id,
            name: nft.name.trim(),
            description: nft.description.trim(),
            supply: Number(nft.supply),
            rarity: nft.rarity,
            rarityPercentage: Number(nft.rarityPercentage),
            image: nftImageAsset
          });
        }
      }

      // Build prize details object
      let prizeDetailsPayload = null;
      if (prizeType) {
        prizeDetailsPayload = {
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
              ? nfts.map(({ id, contract, tokenId }) => ({
                  id,
                  contract: contract.trim(),
                  tokenId: tokenId.trim()
                }))
              : [],
          nft_distribution_type: prizeType === "NFT" ? nftDistributionType : null,
          nft_position_distribution:
            prizeType === "NFT" && nftDistributionType === "custom"
              ? nftPositionDistribution
              : null,
          mintable_nfts:
            prizeType === "MintableNFT"
              ? mintableNftAssets
              : [],
          mintable_nft_distribution_type: prizeType === "MintableNFT" ? mintableNftDistributionType : null,
          mintable_nft_position_distribution:
            prizeType === "MintableNFT" && mintableNftDistributionType === "custom"
              ? mintableNftPositionDistribution
              : null,
          gift_description: prizeType === "Gift" ? giftDescription.trim() : null,
          gift_value: prizeType === "Gift" ? Number(giftValue) : null,
          voucher_description: prizeType === "Voucher" ? voucherDescription.trim() : null,
          voucher_codes: prizeType === "Voucher" ? voucherCodes : []
        };
      }

      const payload = {
        event_type: eventType,
        title: eventTitle.trim(),
        description: eventDescription.trim(),
        video_url: videoUrl.trim() || null,
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
        prize_details: prizeDetailsPayload
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
    <!-- Event Type Selection -->
    <div class="form-block event-type-selector">
      <h2 class="section-title">Choose Event Type</h2>
      <p class="section-description">
        Select how you want to create your event. Quick events include all details upfront, while communities allow you to add tasks and rewards over time.
      </p>
      
      <div class="event-type-options">
        <label class="event-type-card" class:selected={eventType === "quick_event"}>
          <input type="radio" name="event-type" value="quick_event" bind:group={eventType} />
          <div class="type-icon">⚡</div>
          <h3>Quick Event</h3>
          <p>Create a complete event with all tasks and rewards configured immediately. Best for time-limited campaigns.</p>
          <ul class="type-features">
            <li>✓ All tasks configured upfront</li>
            <li>✓ Prize configuration required</li>
            <li>✓ Ready to launch immediately</li>
          </ul>
        </label>

        <label class="event-type-card" class:selected={eventType === "community"}>
          <input type="radio" name="event-type" value="community" bind:group={eventType} />
          <div class="type-icon">🏘️</div>
          <h3>Community</h3>
          <p>Start with basic details and add tasks and rewards progressively. Perfect for ongoing community engagement.</p>
          <ul class="type-features">
            <li>✓ Add tasks over time</li>
            <li>✓ Configure rewards later</li>
            <li>✓ Flexible setup process</li>
          </ul>
        </label>
      </div>
    </div>

    {#if eventType}
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
        <label for="event-description">Event description</label>
        <textarea
          id="event-description"
          placeholder="Describe your event and what participants need to do..."
          bind:value={eventDescription}
          rows="5"
          required
        ></textarea>
      </div>

      <div class="form-group">
        <label for="video-url">Video URL (optional)</label>
        <input
          id="video-url"
          type="url"
          placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
          bind:value={videoUrl}
        />
        <p class="field-hint">Add a video description or promotional video for your event</p>
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

    {#if eventType === "quick_event"}
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
    {/if}

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
    
    <!-- Discord Bot Setup (if Discord task is added) -->
    {#if hasDiscordTask && eventType === "quick_event"}
      <div class="discord-setup-section">
        <h3>🤖 Discord Bot Setup Required</h3>
        <p class="setup-description">
          To verify Discord membership, our bot needs to be added to your server.
        </p>

        <!-- Step 1: Connect Discord -->
        <div class="setup-step" class:completed={discordBotSetup.connected}>
          <div class="step-header">
            <span class="step-number">1</span>
            <h4>Connect Your Discord Account</h4>
            {#if discordBotSetup.connected}
              <span class="check-icon">✓</span>
            {/if}
          </div>
          {#if !discordBotSetup.connected}
            <button type="button" class="secondary-btn" on:click={connectDiscord}>
              Connect Discord
            </button>
          {:else}
            <p class="success-text">✓ Discord connected</p>
          {/if}
        </div>

        <!-- Step 2: Select Server -->
        {#if discordBotSetup.connected}
          <div class="setup-step" class:completed={discordBotSetup.selectedGuildId}>
            <div class="step-header">
              <span class="step-number">2</span>
              <h4>Select Your Server</h4>
              {#if discordBotSetup.selectedGuildId}
                <span class="check-icon">✓</span>
              {/if}
            </div>
            {#if discordBotSetup.guilds.length > 0}
              <select 
                class="guild-select" 
                on:change={(e) => {
                  const guild = discordBotSetup.guilds.find(g => g.id === e.currentTarget.value);
                  if (guild) selectDiscordGuild(guild.id, guild.name);
                }}
                value={discordBotSetup.selectedGuildId || ''}
              >
                <option value="">Select a server...</option>
                {#each discordBotSetup.guilds as guild}
                  <option value={guild.id}>{guild.name}</option>
                {/each}
              </select>
            {:else}
              <p class="info-text">No servers found. Make sure you own or manage a Discord server.</p>
            {/if}
          </div>
        {/if}

        <!-- Step 3: Add Bot to Server -->
        {#if discordBotSetup.selectedGuildId}
          <div class="setup-step" class:completed={discordBotSetup.botAdded}>
            <div class="step-header">
              <span class="step-number">3</span>
              <h4>Add Bot to {discordBotSetup.selectedGuildName}</h4>
              {#if discordBotSetup.botAdded}
                <span class="check-icon">✓</span>
              {/if}
            </div>
            {#if !discordBotSetup.botAdded}
              <div class="bot-invite-section">
                <p class="info-text">Click the button below to add our verification bot to your server:</p>
                <a 
                  href={getBotInviteUrl()} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="primary-btn"
                >
                  Add Bot to Server
                </a>
                <p class="helper-text">After adding the bot, click "Verify Bot Added" below</p>
                <button 
                  type="button" 
                  class="secondary-btn" 
                  on:click={verifyBotAdded}
                  disabled={checkingDiscordBot}
                >
                  {checkingDiscordBot ? 'Checking...' : 'Verify Bot Added'}
                </button>
              </div>
            {:else}
              <p class="success-text">✓ Bot successfully added to server</p>
            {/if}
          </div>
        {/if}

        {#if !discordSetupComplete}
          <div class="setup-warning">
            ⚠️ Complete all Discord setup steps before creating the event
          </div>
        {/if}
      </div>
    {/if}

    <button type="submit" class="primary-btn" disabled={isSaving || !canSubmitForm || !eventType}>
      {isSaving ? "Saving..." : eventType === "community" ? "Create Community" : "Create Event"}
    </button>

    {#if !canSubmitForm && hasDiscordTask}
      <p class="submit-blocked-message">
        Complete Discord bot setup to create event
      </p>
    {/if}

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

  .primary-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    opacity: 0.94;
  }

  .primary-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Discord Setup Section */
  .discord-setup-section {
    background: rgba(88, 101, 242, 0.05);
    border: 2px solid rgba(88, 101, 242, 0.2);
    border-radius: 12px;
    padding: 2rem;
    margin: 2rem 0;
  }

  .discord-setup-section h3 {
    font-size: 1.5rem;
    color: #f2f3ff;
    margin: 0 0 0.5rem;
  }

  .setup-description {
    color: rgba(242, 243, 255, 0.7);
    margin: 0 0 2rem;
  }

  .setup-step {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    transition: border-color 0.3s ease;
  }

  .setup-step.completed {
    border-color: rgba(40, 167, 69, 0.4);
    background: rgba(40, 167, 69, 0.05);
  }

  .step-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .step-number {
    background: rgba(88, 101, 242, 0.2);
    color: #5865f2;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    flex-shrink: 0;
  }

  .setup-step.completed .step-number {
    background: rgba(40, 167, 69, 0.2);
    color: #28a745;
  }

  .step-header h4 {
    flex: 1;
    margin: 0;
    font-size: 1.1rem;
    color: #f2f3ff;
  }

  .check-icon {
    color: #28a745;
    font-size: 1.5rem;
    font-weight: 700;
  }

  .guild-select {
    width: 100%;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: #f2f3ff;
    font-size: 1rem;
  }

  .guild-select option {
    background: #1a1c2d;
    color: #f2f3ff;
  }

  .bot-invite-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .success-text {
    color: #28a745;
    font-weight: 600;
    margin: 0;
  }

  .info-text {
    color: rgba(242, 243, 255, 0.7);
    margin: 0;
  }

  .helper-text {
    color: rgba(242, 243, 255, 0.5);
    font-size: 0.9rem;
    margin: 0;
  }

  .setup-warning {
    background: rgba(255, 193, 7, 0.1);
    border: 1px solid rgba(255, 193, 7, 0.3);
    border-radius: 8px;
    padding: 1rem;
    color: #ffc107;
    font-weight: 600;
    text-align: center;
  }

  .submit-blocked-message {
    color: #ff6b6b;
    text-align: center;
    margin: 1rem 0 0;
    font-weight: 600;
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

  .voucher-input-row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .voucher-input-row input {
    flex: 1;
  }

  .voucher-codes-list {
    margin-top: 1rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    max-height: 300px;
    overflow-y: auto;
  }

  .codes-count {
    margin: 0 0 0.75rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.9rem;
  }

  .voucher-code-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0.8rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    margin-bottom: 0.5rem;
  }

  .voucher-code-item:last-child {
    margin-bottom: 0;
  }

  .code-text {
    font-family: 'Courier New', monospace;
    color: rgba(255, 255, 255, 0.95);
    font-size: 0.95rem;
    word-break: break-all;
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

  /* Event Type Selector Styles */
  .event-type-selector {
    background: linear-gradient(135deg, rgba(111, 160, 255, 0.08), rgba(156, 123, 255, 0.08));
    border: 2px solid rgba(111, 160, 255, 0.2);
  }

  .event-type-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
  }

  .event-type-card {
    position: relative;
    background: rgba(255, 255, 255, 0.04);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 2rem 1.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .event-type-card:hover {
    border-color: rgba(111, 160, 255, 0.4);
    background: rgba(111, 160, 255, 0.08);
    transform: translateY(-2px);
  }

  .event-type-card.selected {
    border-color: #6fa0ff;
    background: rgba(111, 160, 255, 0.15);
    box-shadow: 0 0 0 3px rgba(111, 160, 255, 0.2);
  }

  .event-type-card input[type="radio"] {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .type-icon {
    font-size: 3rem;
    text-align: center;
    margin-bottom: 0.5rem;
  }

  .event-type-card h3 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 700;
    color: #f2f3ff;
    text-align: center;
  }

  .event-type-card p {
    margin: 0;
    color: rgba(242, 243, 255, 0.75);
    font-size: 0.95rem;
    line-height: 1.6;
    text-align: center;
  }

  .type-features {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .type-features li {
    color: rgba(242, 243, 255, 0.85);
    font-size: 0.9rem;
    padding-left: 0.5rem;
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
</style>
