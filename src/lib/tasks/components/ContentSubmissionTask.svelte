<script lang="ts">
	export let config: {
		contentType?: string;
		description?: string;
	};
	export let readonly = false;
	export let onComplete: (() => Promise<void>) | undefined = undefined;

	let submissionLink = '';
	let submitting = false;
	let error = '';

	async function handleSubmit() {
		if (readonly || !onComplete || !submissionLink.trim()) {
			error = 'Please enter a link to your submission';
			return;
		}

		submitting = true;
		error = '';

		try {
			await onComplete();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Submission failed';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="content-task">
	<div class="task-header">
		<div class="task-icon">📝</div>
		<div>
			<h4>Content Creation</h4>
			<p class="task-instructions">Submit {config.contentType || 'content'}</p>
			{#if config.description}
				<p class="task-description">{config.description}</p>
			{/if}
		</div>
	</div>

	<div class="task-body">
		<p class="task-warning">⚠️ Content cannot be resubmitted after submission</p>
		
		{#if !readonly}
			<div class="link-input">
				<label for="submission-link">Link to your submission</label>
				<input 
					id="submission-link"
					type="url" 
					placeholder="https://..."
					bind:value={submissionLink}
					disabled={submitting}
				/>
			</div>
			<button class="submit-btn" on:click={handleSubmit} disabled={submitting || !submissionLink.trim()}>
				{submitting ? 'Submitting...' : 'Submit'}
			</button>
		{:else}
			<p class="completed-text">Content submitted</p>
		{/if}

		{#if error}
			<p class="error-message">{error}</p>
		{/if}
	</div>
</div>

<style>
	.content-task {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
		background: rgba(139, 92, 246, 0.05);
		border: 1px solid rgba(139, 92, 246, 0.2);
		border-radius: 12px;
	}

	.task-header {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.task-icon {
		font-size: 2rem;
		flex-shrink: 0;
	}

	.task-header h4 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #f2f3ff;
		margin: 0;
	}

	.task-instructions {
		font-size: 0.875rem;
		color: rgba(242, 243, 255, 0.7);
		margin: 0.25rem 0 0;
	}

	.task-description {
		font-size: 0.875rem;
		color: rgba(242, 243, 255, 0.6);
		margin: 0.5rem 0 0;
	}

	.task-body {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.task-warning {
		font-size: 0.875rem;
		color: #fbbf24;
		font-weight: 500;
		margin: 0;
		padding: 0.75rem;
		background: rgba(251, 191, 36, 0.1);
		border-radius: 8px;
	}

	.link-input {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.link-input label {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(242, 243, 255, 0.9);
	}

	.link-input input {
		padding: 0.75rem 1rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(139, 92, 246, 0.3);
		border-radius: 8px;
		color: #f2f3ff;
		font-size: 0.9rem;
	}

	.link-input input:focus {
		outline: none;
		border-color: #8b5cf6;
	}

	.link-input input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-btn {
		background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.75rem 1.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		width: fit-content;
	}

	.submit-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.completed-text {
		color: #10b981;
		font-weight: 600;
		margin: 0;
	}

	.error-message {
		color: #ff6b6b;
		font-size: 0.85rem;
		margin: 0;
	}
</style>
