<script lang="ts">
  import { goto } from '$app/navigation';
  import { chainId } from '$lib/wallet';
  
  // Import centralized styles
  import '$lib/styles/event-creation.css';
  
  // Import types
  import type { 
    EventType, 
    RewardConfig,
    UploadedAsset 
  } from '$lib/shared/types/event-creation.types';
  import type { TaskInstance } from '$lib/tasks/TaskTypes';
  
  // Import config
  import { MAX_BANNER_SIZE, MAX_LOGO_SIZE } from '$lib/config/event-creation.config';
  
  // Import utils
  import { clone } from '$lib/utils/event-creation.utils';
  
  // Import components
  import EventTypeSelector from '$lib/components/event-creation/EventTypeSelector.svelte';
  import EventBasicInfoForm from '$lib/components/event-creation/EventBasicInfoForm.svelte';
  import EventScheduleForm from '$lib/components/event-creation/EventScheduleForm.svelte';
  import AssetUploader from '$lib/components/event-creation/AssetUploader.svelte';
  import TaskBuilder from '$lib/components/event-creation/TaskBuilder.svelte';
  import TaskList from '$lib/components/event-creation/TaskList.svelte';
  import RewardConfigSection from '$lib/components/event-creation/RewardConfigSection.svelte';
  import EventPreview from '$lib/components/event-creation/EventPreview.svelte';
  import SubmitEventButton from '$lib/components/event-creation/SubmitEventButton.svelte';

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  // Event type
  let eventType: EventType = '';
  
  // Basic info
  let title = '';
  let description = '';
  let videoUrl = '';
  let numWinners = '';
  
  // Schedule
  let startDate = '';
  let startTime = '';
  let endDate = '';
  let endTime = '';
  let startISO: string | null = null;
  let endISO: string | null = null;
  let scheduleError = '';
  
  // Assets
  let bannerFile: File | null = null;
  let bannerPreview = '';
  let bannerError = '';
  let logoFile: File | null = null;
  let logoPreview = '';
  let logoError = '';
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

  // ============================================
  // VALIDATION
  // ============================================
  
  function validateForm(): string[] {
    const errors: string[] = [];
    
    // Basic info validation
    if (!title.trim()) {
      errors.push('Event title is required');
    }
    if (!description.trim()) {
      errors.push('Event description is required');
    }
    
    // Schedule validation
    if (!startISO || !endISO) {
      errors.push('Start and end dates are required');
    }
    if (scheduleError) {
      errors.push(scheduleError);
    }
    
    // Assets validation
    if (!logoPreview && !uploadedLogo) {
      errors.push('Event logo is required');
    }
    
    // Tasks validation (for quick events)
    if (eventType === 'quick_event' && tasks.length === 0) {
      errors.push('At least one task is required');
    }
    
    // Rewards validation
    if (rewards.length === 0) {
      errors.push('At least one reward is required');
    }
    
    return errors;
  }
  
  $: validationErrors = validateForm();
  $: isValid = validationErrors.length === 0;

  // ============================================
  // FILE UPLOAD
  // ============================================
  
  async function uploadAsset(file: File, kind: 'banner' | 'logo'): Promise<UploadedAsset> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', kind);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include'
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
          bannerAsset = await uploadAsset(bannerFile, 'banner');
          uploadedBanner = bannerAsset;
        } catch (err) {
          console.warn('Banner upload failed:', err);
          bannerAsset = null;
        }
      }
      
      // Upload logo (required)
      let logoAsset: UploadedAsset | null = uploadedLogo;
      if (logoFile) {
        logoAsset = await uploadAsset(logoFile, 'logo');
        uploadedLogo = logoAsset;
      }
      
      if (!logoAsset) {
        throw new Error('Logo upload failed');
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
          logo: logoAsset
        },
        tasks: tasks.map(task => ({
          id: task.id,
          type: task.type,
          config: clone(task.config)
        })),
        rewards: rewards.map(reward => clone(reward))
      };
      
      // Submit event
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? 'Failed to create event');
      }
      
      const { id } = await response.json();
      
      // Redirect to event page or dashboard
      await goto(`/events/${id}`, { replaceState: true });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create event';
      validationErrors = [...validationErrors, errorMessage];
    } finally {
      isSaving = false;
    }
  }
</script>

<svelte:head>
  <title>Create Event | Event Launchpad</title>
  <meta name="description" content="Create a new event with tasks and rewards" />
</svelte:head>

<div class="event-creation-container">
  <header class="page-header">
    <h1>Create Your Event</h1>
    <p>Build engaging events with custom tasks and rewards</p>
  </header>

  <!-- Step 1: Event Type Selection -->
  {#if !eventType}
    <EventTypeSelector
      selectedType={eventType}
      onSelect={(type) => { eventType = type; }}
    />
  {/if}

  {#if eventType}
    <div class="creation-form slide-down">
      <!-- Step 2: Basic Information -->
      <EventBasicInfoForm
        bind:title
        bind:description
        bind:videoUrl
        bind:numWinners
        showWinners={eventType === 'quick_event'}
      />

      <!-- Step 3: Schedule -->
      <EventScheduleForm
        bind:startDate
        bind:startTime
        bind:endDate
        bind:endTime
        bind:startISO
        bind:endISO
        bind:error={scheduleError}
      />

      <!-- Step 4: Visual Assets -->
      <div class="event-creation-section">
        <div class="section-header">
          <h2>Visual Assets</h2>
          <p class="section-description">Upload banner and logo for your event</p>
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
            bannerPreview = '';
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
            logoPreview = '';
          }}
        />
      </div>

      <!-- Step 5: Tasks -->
      <div class="event-creation-section">
        <div class="section-header">
          <h2>Event Tasks</h2>
          <p class="section-description">
            Add tasks for participants to complete
            {#if eventType === 'community'}
              to earn points
            {/if}
          </p>
        </div>

        <TaskBuilder
          {eventType}
          editingTask={editingTaskIndex !== null ? tasks[editingTaskIndex] : null}
          onSave={handleTaskSave}
          onCancel={() => { editingTaskIndex = null; }}
        />

        <TaskList
          {tasks}
          onEdit={handleTaskEdit}
          onDelete={handleTaskDelete}
          onMoveUp={handleTaskMoveUp}
          onMoveDown={handleTaskMoveDown}
        />
      </div>

      <!-- Step 6: Rewards -->
      <RewardConfigSection
        {eventType}
        bind:rewards
        {numWinners}
        chainId={$chainId?.toString() || ''}
        onUpdate={(updated) => { rewards = updated; }}
      />

      <!-- Step 7: Preview -->
      {#if isValid}
        <EventPreview
          {title}
          {description}
          startISO={startISO || ''}
          endISO={endISO || ''}
          {tasks}
          {rewards}
          {bannerPreview}
          {logoPreview}
          {videoUrl}
          {numWinners}
        />
      {/if}

      <!-- Step 8: Submit -->
      <SubmitEventButton
        {isValid}
        isSubmitting={isSaving}
        {validationErrors}
        onSubmit={handleSubmit}
        buttonText="Create Event"
      />
    </div>
  {/if}
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
</style>
