<script lang="ts">
  import {
    validateDateTime,
    validateSchedule,
  } from "$lib/utils/event-creation.utils";
  import { ASSETS } from "$lib/config/assets";

  export let startDate: string = "";
  export let startTime: string = "";
  export let endDate: string = "";
  export let endTime: string = "";
  export let startISO: string | null = null;
  export let endISO: string | null = null;
  export let error: string = "";

  // Reactive validation
  $: if (startDate && startTime) {
    const result = validateDateTime(startDate, startTime);
    if (result.valid && result.isoString) {
      startISO = result.isoString;
      validateCompleteSchedule();
    } else {
      error = result.error || "Invalid start date/time";
      startISO = null;
    }
  } else {
    startISO = null;
  }

  $: if (endDate && endTime) {
    const result = validateDateTime(endDate, endTime);
    if (result.valid && result.isoString) {
      endISO = result.isoString;
      validateCompleteSchedule();
    } else {
      error = result.error || "Invalid end date/time";
      endISO = null;
    }
  } else {
    endISO = null;
  }

  function validateCompleteSchedule() {
    if (startISO && endISO) {
      const result = validateSchedule(startISO, endISO);
      if (!result.valid) {
        error = result.error || "Invalid schedule";
      } else {
        error = "";
      }
    }
  }

  // Set minimum date to today
  const today = new Date().toISOString().split("T")[0];
</script>

<div class="schedule-form">
  <h2>Event Schedule</h2>
  <p class="section-description">Set when your event starts and ends</p>

  <div class="schedule-grid">
    <!-- Start Date/Time -->
    <div class="datetime-group">
      <h3>Start Date & Time *</h3>
      <div class="datetime-inputs">
        <div class="form-group">
          <label for="start-date">Date</label>
          <input
            id="start-date"
            type="date"
            bind:value={startDate}
            min={today}
          />
        </div>
        <div class="form-group">
          <label for="start-time">Time (UTC)</label>
          <input id="start-time" type="time" bind:value={startTime} />
        </div>
      </div>
    </div>

    <!-- End Date/Time -->
    <div class="datetime-group">
      <h3>End Date & Time *</h3>
      <div class="datetime-inputs">
        <div class="form-group">
          <label for="end-date">Date</label>
          <input
            id="end-date"
            type="date"
            bind:value={endDate}
            min={startDate || today}
          />
        </div>
        <div class="form-group">
          <label for="end-time">Time (UTC)</label>
          <input id="end-time" type="time" bind:value={endTime} />
        </div>
      </div>
    </div>
  </div>

  <!-- Error Message -->
  {#if error}
    <div class="error-message">
      <span class="error-icon">⚠️</span>
      {error}
    </div>
  {/if}

  <!-- Success Preview -->
  {#if startISO && endISO && !error}
    <div class="schedule-preview">
      <div class="preview-content">
        <strong>Event Duration:</strong>
        <p>
          {new Date(startISO).toLocaleString()}
          →
          {new Date(endISO).toLocaleString()}
        </p>
      </div>
      <span class="success-icon"
        ><img src={ASSETS.icons.successIcon} alt="Success" /></span
      >
    </div>
  {/if}
</div>

<style>
  .schedule-form {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
  }

  h2 {
    color: #fff;
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
  }

  .section-description {
    color: #888;
    margin-bottom: 1.5rem;
  }

  .schedule-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
    margin-bottom: 1rem;
  }

  .datetime-group h3 {
    color: #fff;
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }

  .datetime-inputs {
    display: flex;
    gap: 1rem;
  }

  .form-group {
    flex: 1;
  }

  label {
    display: block;
    color: #aaa;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #fff;
    font-family: inherit;
    font-size: 1rem;
    transition: all 0.3s ease;
  }

  input:focus {
    outline: none;
    border-color: #8b5cf6;
    background: rgba(255, 255, 255, 0.08);
  }

  /* Color scheme for date/time inputs */
  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="time"]::-webkit-calendar-picker-indicator {
    filter: invert(1);
    cursor: pointer;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #ef4444;
    margin-top: 1rem;
  }

  .error-icon {
    font-size: 1.25rem;
  }

  .schedule-preview {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 8px;
    margin-top: 1rem;
  }

  .success-icon {
    color: #10b981;
    font-size: 1.25rem;
    font-weight: bold;
  }

  .success-icon img {
    width: 1rem;
    height: 1rem;
  }

  .preview-content {
    flex: 1;
    color: #fff;
  }

  .preview-content strong {
    display: block;
    margin-bottom: 0.25rem;
    color: #10b981;
  }

  .preview-content p {
    color: #aaa;
    font-size: 0.875rem;
    margin: 0;
  }
</style>
