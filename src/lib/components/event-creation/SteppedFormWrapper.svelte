<script lang="ts">
    import { onMount } from "svelte";

    export let currentStep = 1;
    export let totalSteps = 5;
    export let storageKey = "event-creation-progress";

    // Accept step validity as a reactive prop from parent
    export let isStepValid: boolean = false;

    $: canGoNext = isStepValid && currentStep < totalSteps;
    $: canGoBack = currentStep > 1;

    // Save to localStorage whenever currentStep changes
    $: if (typeof window !== "undefined" && currentStep) {
        saveProgress();
    }

    function saveProgress() {
        try {
            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    currentStep,
                    savedAt: new Date().toISOString(),
                }),
            );
        } catch (e) {
            console.error("Failed to save progress:", e);
        }
    }

    function loadProgress() {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const { currentStep: savedStep } = JSON.parse(saved);
                currentStep = savedStep || 1;
                return true;
            }
        } catch (e) {
            console.error("Failed to load progress:", e);
        }
        return false;
    }

    export function clearProgress() {
        try {
            localStorage.removeItem(storageKey);
            currentStep = 1;
        } catch (e) {
            console.error("Failed to clear progress:", e);
        }
    }

    function nextStep() {
        if (canGoNext) {
            currentStep++;
        }
    }

    function prevStep() {
        if (canGoBack) {
            currentStep--;
        }
    }

    onMount(() => {
        loadProgress();
    });
</script>

<div class="stepped-form">
    <!-- Progress Indicator -->
    <div class="progress-header">
        <div class="progress-bar">
            <div
                class="progress-fill"
                style="width: {(currentStep / totalSteps) * 100}%"
            ></div>
        </div>
        <div class="step-indicator">
            Step {currentStep} of {totalSteps}
        </div>
    </div>

    <!-- Step Content -->
    <div class="step-content">
        <slot {currentStep} />
    </div>

    <!-- Navigation Controls -->
    <div class="navigation-controls">
        <button
            type="button"
            class="btn-secondary"
            on:click={prevStep}
            disabled={!canGoBack}
        >
            ← Back
        </button>

        {#if currentStep < totalSteps}
            <button
                type="button"
                class="btn-primary"
                on:click={nextStep}
                disabled={!canGoNext}
                title={!isStepValid
                    ? "Complete required fields to continue"
                    : ""}
            >
                Next →
            </button>
        {:else}
            <slot name="submit-button">
                <button
                    type="submit"
                    class="btn-submit"
                    disabled={!isStepValid}
                >
                    Create Event
                </button>
            </slot>
        {/if}
    </div>
</div>

<style>
    .stepped-form {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        min-height: 600px;
    }

    .progress-header {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .progress-bar {
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #8b5cf6, #7c3aed);
        transition: width 0.3s ease;
        border-radius: 10px;
    }

    .step-indicator {
        text-align: center;
        color: rgba(255, 255, 255, 0.7);
        font-size: 0.9rem;
        font-weight: 500;
    }

    .step-content {
        flex: 1;
        min-height: 400px;
    }

    .navigation-controls {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding-top: 2rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    button {
        padding: 0.75rem 2rem;
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
    }

    .btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-secondary:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.15);
    }

    .btn-primary {
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        color: #fff;
    }

    .btn-primary:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    }

    .btn-submit {
        background: linear-gradient(135deg, #10b981, #059669);
        color: #fff;
        padding: 0.875rem 2.5rem;
    }

    .btn-submit:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
