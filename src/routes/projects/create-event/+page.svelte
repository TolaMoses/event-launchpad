<script lang="ts">
  import { onDestroy } from "svelte";
  import { ethers } from "ethers";
  import { chainId } from "$lib/wallet";
  import { TOKEN_LIST } from "$lib/tokens";
  import { taskRegistry } from "$lib/tasks";
  import type { TaskInstance, TaskTypeKey } from "$lib/tasks/TaskTypes";

  type NftInput = {
    id: string;
    contract: string;
    tokenId: string;
  };

  const registryEntries = Object.entries(taskRegistry) as [
    TaskTypeKey,
    (typeof taskRegistry)[TaskTypeKey]
  ][];

  const taskOptions = registryEntries
    .filter(([key]) => key !== "irl")
    .map(([value, entry]) => ({ value, label: entry.label }));

  const detailedPrizeOptions: { value: string; label: string }[] = [
    { value: "Token", label: "Token" },
    { value: "ETH", label: "Native coin" },
    { value: "NFT", label: "NFT" }
  ];

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

  let selectedTaskType: TaskTypeKey | "" = "";
  let creatingTaskType: TaskTypeKey | null = null;
  let editingTaskIndex: number | null = null;
  let tasks: TaskInstance[] = [];

  let prizeType = "";
  let prizeAddress = "";
  let prizePool = "";
  let maxTickets = "";
  let nfts: NftInput[] = [];
  let availableTokens: { symbol: string; address: string; decimals: number }[] = [];

  let submitAttempted = false;
  let validationErrors: string[] = [];

  $: availableTokens = $chainId ? TOKEN_LIST[$chainId] ?? [] : [];

  $: if (prizeType === "NFT" && nfts.length === 0) {
    nfts = [{ id: generateId(), contract: "", tokenId: "" }];
  }

  function handleBannerUpload(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (bannerPreview) {
      URL.revokeObjectURL(bannerPreview);
    }

    bannerFile = file;
    bannerPreview = file ? URL.createObjectURL(file) : "";
  }

  onDestroy(() => {
    if (bannerPreview) {
      URL.revokeObjectURL(bannerPreview);
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

    if (!prizeType) errors.push("Select a detailed prize type");

    if (prizeType === "Token") {
      if (!prizeAddress) errors.push("Select a prize token");
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
    }

    if (prizeType === "ETH" && (!prizePool || Number(prizePool) <= 0)) {
      errors.push("Enter a positive native coin prize pool");
    }

    if (prizeType === "NFT") {
      if (nfts.length === 0) errors.push("Add at least one NFT");
      if (nfts.some((nft) => !nft.contract.trim() || !nft.tokenId.trim())) {
        errors.push("Each NFT must include contract and token ID");
      }
      if (winnersInt && winnersInt > 0 && nfts.length % winnersInt !== 0) {
        errors.push("Number of NFTs must be divisible by number of winners");
      }
    }

    validationErrors = errors;
    return errors.length === 0;
  }

  async function createEvent() {
    submitAttempted = true;
    validationErrors = [];

    if (!isFormValid()) return;

    const payload = {
      title: eventTitle.trim(),
      description: eventDescription.trim(),
      start_time: eventStartISO,
      end_time: eventEndISO,
      num_winners: numWinners ? Number(numWinners) : null,
      banner: bannerFile,
      tasks: tasks.map((task) => ({
        id: task.id,
        type: task.type,
        config: clone(task.config)
      })),
      prize_details: {
        type: prizeType,
        token_address: prizeType === "Token" ? prizeAddress : null,
        prize_pool: prizePool ? Number(prizePool) : null,
        nfts:
          prizeType === "NFT"
            ? nfts.map(({ contract, tokenId }) => ({
                contract: contract.trim(),
                tokenId: tokenId.trim()
              }))
            : []
      }
    };

    console.log("Event payload", payload);
    alert("Event configuration captured. Integrate persistence or blockchain flow next.");
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
        <label for="banner-upload">Image / banner upload</label>
        <div class="file-input">
          <input id="banner-upload" type="file" accept="image/*" on:change={handleBannerUpload} />
          <span>Upload banner image</span>
        </div>
        {#if bannerPreview}
          <img class="banner-preview" src={bannerPreview} alt="Event banner preview" />
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
        <div class="grid-two">
          <div class="form-group">
            <label for="prize-token">Prize token</label>
            <select id="prize-token" bind:value={prizeAddress} required>
              <option disabled hidden value="">Select token</option>
              {#each availableTokens as token}
                <option value={token.address}>
                  {token.symbol} ({token.decimals} decimals)
                </option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label for="token-prize-pool">Prize pool</label>
            <input
              id="token-prize-pool"
              type="number"
              min="0"
              step="any"
              bind:value={prizePool}
              required
            />
          </div>
        </div>
      {/if}

      {#if prizeType === "ETH"}
        <div class="form-group">
          <label for="native-prize-pool">Native coin prize pool</label>
          <input id="native-prize-pool" type="number" min="0" step="any" bind:value={prizePool} required />
        </div>
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
              : numWinners
              ? "—"
              : "All eligible participants rewarded"
          }
          readonly
        />
      </div>
    </div>

    <button type="submit" class="primary-btn">Create Event</button>

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
    cursor: pointer;
  }

  .file-input span {
    pointer-events: none;
    font-weight: 600;
    color: rgba(242, 243, 255, 0.85);
  }

  .banner-preview {
    margin-top: 0.75rem;
    max-height: 200px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    object-fit: cover;
  }

  .task-builder {
    background: rgba(12, 14, 30, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.08);
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
