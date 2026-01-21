<script lang="ts">
  import { validateFileSize, validateImageType, createPreviewUrl } from '$lib/utils/event-creation.utils';
  import type { UploadKind } from '$lib/shared/types/event-creation.types';

  export let kind: UploadKind;
  export let file: File | null = null;
  export let preview: string = '';
  export let error: string = '';
  export let maxSize: number;
  export let onFileSelect: (file: File, previewUrl: string) => void = () => {};
  export let onClear: () => void = () => {};

  const labels = {
    banner: {
      title: 'Event Banner',
      description: 'Recommended: 1200x400px, Max size: 500KB',
      placeholder: 'Upload event banner image'
    },
    logo: {
      title: 'Event Logo',
      description: 'Recommended: 400x400px, Max size: 150KB',
      placeholder: 'Upload event logo image'
    },
    nft: {
      title: 'NFT Image',
      description: 'Recommended: Square image, Max size: 500KB',
      placeholder: 'Upload NFT image'
    }
  };

  let fileInput: HTMLInputElement;
  let isDragging = false;

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const selectedFile = target.files?.[0];
    
    if (selectedFile) {
      processFile(selectedFile);
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    
    const droppedFile = event.dataTransfer?.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  function processFile(selectedFile: File) {
    error = '';
    
    // Validate file type
    const typeValidation = validateImageType(selectedFile);
    if (!typeValidation.valid) {
      error = typeValidation.error || 'Invalid file type';
      return;
    }

    // Validate file size
    const sizeValidation = validateFileSize(selectedFile, maxSize);
    if (!sizeValidation.valid) {
      error = sizeValidation.error || 'File too large';
      return;
    }

    // Create preview
    const previewUrl = createPreviewUrl(selectedFile);
    
    // Notify parent
    file = selectedFile;
    preview = previewUrl;
    onFileSelect(selectedFile, previewUrl);
  }

  function clearFile() {
    file = null;
    preview = '';
    error = '';
    if (fileInput) {
      fileInput.value = '';
    }
    onClear();
  }

  function openFilePicker() {
    fileInput?.click();
  }
</script>

<div class="asset-uploader">
  <h3>{labels[kind].title} *</h3>
  <p class="description">{labels[kind].description}</p>

  <!-- Hidden file input -->
  <input
    type="file"
    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
    bind:this={fileInput}
    on:change={handleFileSelect}
    style="display: none;"
  />

  {#if preview}
    <!-- Preview -->
    <div class="preview-container">
      <img src={preview} alt="{labels[kind].title} preview" class="preview-image {kind}" />
      <button type="button" class="clear-button" on:click={clearFile} title="Remove image">
        ✕
      </button>
    </div>
  {:else}
    <!-- Upload area -->
    <div
      class="upload-area"
      class:dragging={isDragging}
      class:error={error}
      on:click={openFilePicker}
      on:drop={handleDrop}
      on:dragover={handleDragOver}
      on:dragleave={handleDragLeave}
      role="button"
      tabindex="0"
      on:keydown={(e) => e.key === 'Enter' && openFilePicker()}
    >
      <div class="upload-icon">📁</div>
      <p class="upload-text">{labels[kind].placeholder}</p>
      <p class="upload-hint">Click to browse or drag and drop</p>
    </div>
  {/if}

  <!-- Error message -->
  {#if error}
    <div class="error-message">
      <span class="error-icon">⚠️</span>
      {error}
    </div>
  {/if}
</div>

<style>
  .asset-uploader {
    margin-bottom: 1.5rem;
  }

  h3 {
    color: #fff;
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }

  .description {
    color: #888;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .upload-area {
    border: 2px dashed rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 3rem 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background: rgba(255, 255, 255, 0.02);
  }

  .upload-area:hover {
    border-color: rgba(139, 92, 246, 0.5);
    background: rgba(139, 92, 246, 0.05);
  }

  .upload-area.dragging {
    border-color: #8b5cf6;
    background: rgba(139, 92, 246, 0.1);
    transform: scale(1.02);
  }

  .upload-area.error {
    border-color: rgba(239, 68, 68, 0.5);
    background: rgba(239, 68, 68, 0.05);
  }

  .upload-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.6;
  }

  .upload-text {
    color: #fff;
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .upload-hint {
    color: #888;
    font-size: 0.875rem;
  }

  .preview-container {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.3);
  }

  .preview-image {
    width: 100%;
    display: block;
  }

  .preview-image.banner {
    max-height: 300px;
    object-fit: cover;
  }

  .preview-image.logo {
    max-width: 200px;
    max-height: 200px;
    object-fit: contain;
    margin: 1rem auto;
  }

  .preview-image.nft {
    max-width: 300px;
    max-height: 300px;
    object-fit: contain;
    margin: 1rem auto;
  }

  .clear-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    border: none;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    font-size: 1.25rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }

  .clear-button:hover {
    background: #ef4444;
    transform: scale(1.1);
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #ef4444;
    margin-top: 0.75rem;
    font-size: 0.875rem;
  }

  .error-icon {
    font-size: 1.125rem;
  }
</style>
