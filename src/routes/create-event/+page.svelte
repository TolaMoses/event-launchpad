<script lang="ts">
  import { goto } from "$app/navigation";
  import { chainId } from "$lib/wallet";

  // Import centralized styles
  import "$lib/styles/event-creation.css";

  // Import types
  import type {
    RewardConfig,
    UploadedAsset,
  } from "$lib/shared/types/event-creation.types";
  import type { TaskInstance } from "$lib/tasks/TaskTypes";

  // Import config
  import {
    MAX_BANNER_SIZE,
    MAX_LOGO_SIZE,
  } from "$lib/config/event-creation.config";

  // Import utils
  import { clone } from "$lib/utils/event-creation.utils";

  // Import components
  import SteppedFormWrapper from "$lib/components/event-creation/SteppedFormWrapper.svelte";
  import EventBasicInfoForm from "$lib/components/event-creation/EventBasicInfoForm.svelte";
  import EventScheduleForm from "$lib/components/event-creation/EventScheduleForm.svelte";
  import AssetUploader from "$lib/components/event-creation/AssetUploader.svelte";
  import TaskBuilder from "$lib/components/event-creation/TaskBuilder.svelte";
  import TaskList from "$lib/components/event-creation/TaskList.svelte";
  import RewardConfigSection from "$lib/components/event-creation/RewardConfigSection.svelte";
  import EventPreview from "$lib/components/event-creation/EventPreview.svelte";
  import SubmitEventButton from "$lib/components/event-creation/SubmitEventButton.svelte";

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  // Basic info
  let title = "";
  let description = "";
  let videoUrl = "";
  let numWinners = "";

  // Schedule
  let startDate = "";
  let startTime = "";
  let endDate = "";
  let endTime = "";
  let startISO: string | null = null;
  let endISO: string | null = null;
  let scheduleError = "";

  // Assets
  let bannerFile: File | null = null;
  let bannerPreview = "";
  let bannerError = "";
  let logoFile: File | null = null;
  let logoPreview = "";
  let logoError = "";
  let uploadedBanner: UploadedAsset | null = null;
  let uploadedLogo: UploadedAsset | null = null;

  // Tasks
  let tasks: TaskInstance[] = [];
  let editingTaskIndex: number | null = null;

  // Rewards
  let rewards: RewardConfig[] = [];

  // Submission
  let isSaving = false;
  let validationErrors: string[] = [];

  // Stepped form
  let currentStep = 1;

  // Reactive step validation - updates when form fields change
  $: isStep1Valid = Boolean(title?.trim() && description?.trim());
  $: isStep2Valid = Boolean(startISO && endISO && !scheduleError);
  $: isStep3Valid = Boolean(logoPreview || uploadedLogo);
  $: isStep4Valid = tasks.length > 0;
  $: isStep5Valid = rewards.length > 0;

  // Current step validation - this is reactive and will update
  $: isCurrentStepValid = (() => {
    switch (currentStep) {
      case 1:
        return isStep1Valid;
      case 2:
        return isStep2Valid;
      case 3:
        return isStep3Valid;
      case 4:
        return isStep4Valid;
      case 5:
        return isStep5Valid;
      default:
        return false;
    }
  })();

  // ============================================
  // FILE UPLOAD
  // ============================================

  async function uploadAsset(
    file: File,
    kind: "banner" | "logo",
  ): Promise<UploadedAsset> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to upload ${kind}`);
    }

    return await response.json();
  }

  // ============================================
  // TASK MANAGEMENT
  // ============================================

  function handleTaskSave(task: TaskInstance) {
    if (editingTaskIndex !== null) {
      tasks[editingTaskIndex] = task;
      tasks = [...tasks];
      editingTaskIndex = null;
    } else {
      tasks = [...tasks, task];
    }
  }

  function handleTaskEdit(index: number) {
    editingTaskIndex = index;
  }

  function handleTaskDelete(index: number) {
    tasks = tasks.filter((_, i) => i !== index);
    if (editingTaskIndex === index) {
      editingTaskIndex = null;
    }
  }

  function handleTaskMoveUp(index: number) {
    if (index > 0) {
      const temp = tasks[index];
      tasks[index] = tasks[index - 1];
      tasks[index - 1] = temp;
      tasks = [...tasks];
    }
  }

  function handleTaskMoveDown(index: number) {
    if (index < tasks.length - 1) {
      const temp = tasks[index];
      tasks[index] = tasks[index + 1];
      tasks[index + 1] = temp;
      tasks = [...tasks];
    }
  }

  // ============================================
  // EVENT SUBMISSION
  // ============================================

  async function handleSubmit() {
    if (!isValid || isSaving) return;

    isSaving = true;

    try {
      // Upload banner if present
      let bannerAsset: UploadedAsset | null = uploadedBanner;
      if (bannerFile) {
        try {
          bannerAsset = await uploadAsset(bannerFile, "banner");
          uploadedBanner = bannerAsset;
        } catch (err) {
          console.warn("Banner upload failed:", err);
          bannerAsset = null;
        }
      }

      // Upload logo (required)
      let logoAsset: UploadedAsset | null = uploadedLogo;
      if (logoFile) {
        logoAsset = await uploadAsset(logoFile, "logo");
        uploadedLogo = logoAsset;
      }

      if (!logoAsset) {
        throw new Error("Logo upload failed");
      }

      // Prepare payload
      const payload = {
        title: title.trim(),
        description: description.trim(),
        video_url: videoUrl.trim() || null,
        start_time: startISO,
        end_time: endISO,
        num_winners: numWinners ? Number(numWinners) : null,
        assets: {
          banner: bannerAsset,
          logo: logoAsset,
        },
        tasks: tasks.map((task) => ({
          id: task.id,
          type: task.type,
          config: clone(task.config),
        })),
        rewards: rewards.map((reward) => clone(reward)),
      };

      // Submit event
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? "Failed to create event");
      }

      const { id } = await response.json();

      // Redirect to event page or dashboard
      await goto(`/events/${id}`, { replaceState: true });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create event";
      validationErrors = [...validationErrors, errorMessage];
    } finally {
      isSaving = false;
    }
  }
</script>

<svelte:head>
  <title>Create Event | Event Launchpad</title>
  <meta
    name="description"
    content="Create a new event with tasks and rewards"
  />
</svelte:head>

<div class="event-creation-container">
  <header class="page-header">
    <h1>Create Your Event</h1>
    <p>Build engaging events with custom tasks and rewards</p>
  </header>

  <SteppedFormWrapper
    bind:currentStep
    isStepValid={isCurrentStepValid}
    totalSteps={5}
    storageKey="event-creation-progress"
    let:currentStep
  >
    <form
      class="creation-form slide-down"
      on:submit|preventDefault={handleSubmit}
    >
      <!-- Step 1: Basic Information -->
      {#if currentStep === 1}
        <div class="step-section">
          <h2 class="step-title">Basic Details</h2>
          <EventBasicInfoForm
            bind:title
            bind:description
            bind:videoUrl
            bind:numWinners
            showWinners={true}
          />
        </div>
      {/if}

      <!-- Step 2: Schedule -->
      {#if currentStep === 2}
        <div class="step-section">
          <h2 class="step-title">Event Schedule</h2>
          <EventScheduleForm
            bind:startDate
            bind:startTime
            bind:endDate
            bind:endTime
            bind:startISO
            bind:endISO
            bind:error={scheduleError}
          />
        </div>
      {/if}

      <!-- Step 3: Visual Assets -->
      {#if currentStep === 3}
        <div class="step-section">
          <h2 class="step-title">Visual Assets</h2>
          <div class="event-creation-section">
            <div class="section-header">
              <h3>Upload banner and logo for your event</h3>
            </div>

            <AssetUploader
              kind="banner"
              bind:file={bannerFile}
              bind:preview={bannerPreview}
              bind:error={bannerError}
              maxSize={MAX_BANNER_SIZE}
              onFileSelect={(file, preview) => {
                bannerFile = file;
                bannerPreview = preview;
              }}
              onClear={() => {
                bannerFile = null;
                bannerPreview = "";
              }}
            />

            <AssetUploader
              kind="logo"
              bind:file={logoFile}
              bind:preview={logoPreview}
              bind:error={logoError}
              maxSize={MAX_LOGO_SIZE}
              onFileSelect={(file, preview) => {
                logoFile = file;
                logoPreview = preview;
              }}
              onClear={() => {
                logoFile = null;
                logoPreview = "";
              }}
            />
          </div>
        </div>
      {/if}

      <!-- Step 4: Tasks -->
      {#if currentStep === 4}
        <div class="step-section">
          <h2 class="step-title">✅ Event Tasks</h2>
          <div class="event-creation-section">
            <div class="section-header">
              <p class="section-description">
                Add tasks for participants to complete
              </p>
            </div>

            <TaskBuilder
              editingTask={editingTaskIndex !== null
                ? tasks[editingTaskIndex]
                : null}
              onSave={handleTaskSave}
              onCancel={() => {
                editingTaskIndex = null;
              }}
            />

            <TaskList
              {tasks}
              onEdit={handleTaskEdit}
              onDelete={handleTaskDelete}
              onMoveUp={handleTaskMoveUp}
              onMoveDown={handleTaskMoveDown}
            />
          </div>
        </div>
      {/if}

      <!-- Step 5: Rewards -->
      {#if currentStep === 5}
        <div class="step-section">
          <h2 class="step-title">Rewards</h2>
          <RewardConfigSection
            bind:rewards
            {numWinners}
            chainId={$chainId?.toString() || ""}
            onUpdate={(updated) => {
              rewards = updated;
            }}
          />
        </div>
      {/if}
    </form>

    <svelte:fragment slot="submit-button">
      <SubmitEventButton
        isValid={validateStep(5)}
        isSubmitting={isSaving}
        {validationErrors}
        onSubmit={handleSubmit}
        buttonText="Create Event"
      />
    </svelte:fragment>
  </SteppedFormWrapper>
</div>

<style>
  .page-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .page-header h1 {
    font-size: 2.5rem;
    color: var(--ec-text-primary);
    margin-bottom: 0.5rem;
  }

  .page-header p {
    font-size: 1.125rem;
    color: var(--ec-text-secondary);
  }

  .creation-form {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  @media (max-width: 768px) {
    .page-header h1 {
      font-size: 2rem;
    }

    .page-header p {
      font-size: 1rem;
    }
  }

  .event-creation-section h2 {
    margin-bottom: 0.5rem;
    font-size: 1.25rem;
  }

  .step-section {
    margin-bottom: 1rem;
  }

  .step-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #fff;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid rgba(139, 92, 246, 0.3);
  }
</style>
