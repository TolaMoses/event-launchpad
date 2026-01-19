<script lang="ts">
	export let config: {
		question?: string;
		description?: string;
		correctAnswer?: string;
	};
	export let readonly = false;
	export let onComplete: (() => Promise<void>) | undefined = undefined;

	let answer = '';
	let submitting = false;
	let error = '';

	async function handleSubmit() {
		if (readonly || !onComplete || !answer.trim()) {
			error = 'Please enter your answer';
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

<div class="puzzle-task">
	<div class="task-header">
		<div class="task-icon">🧩</div>
		<div>
			<h4>Puzzle/Riddle</h4>
			{#if config.description}
				<p class="task-description">{config.description}</p>
			{/if}
		</div>
	</div>

	<div class="task-body">
		{#if config.question}
			<div class="puzzle-question">
				<p>{config.question}</p>
			</div>
		{/if}

		{#if !readonly}
			<div class="answer-input">
				<label for="puzzle-answer">Your Answer</label>
				<input 
					id="puzzle-answer"
					type="text" 
					placeholder="Enter your answer..."
					bind:value={answer}
					disabled={submitting}
				/>
			</div>
			<button class="submit-btn" on:click={handleSubmit} disabled={submitting || !answer.trim()}>
				{submitting ? 'Submitting...' : 'Submit Answer'}
			</button>
		{:else}
			<p class="completed-text">Answer submitted</p>
		{/if}

		{#if error}
			<p class="error-message">{error}</p>
		{/if}
	</div>
</div>

<style>
	.puzzle-task {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
		background: rgba(245, 158, 11, 0.05);
		border: 1px solid rgba(245, 158, 11, 0.2);
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

	.task-description {
		font-size: 0.875rem;
		color: rgba(242, 243, 255, 0.7);
		margin: 0.25rem 0 0;
	}

	.task-body {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.puzzle-question {
		padding: 1.5rem;
		background: rgba(0, 0, 0, 0.2);
		border-left: 4px solid #f59e0b;
		border-radius: 8px;
	}

	.puzzle-question p {
		font-size: 1rem;
		color: #f2f3ff;
		margin: 0;
		line-height: 1.6;
	}

	.answer-input {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.answer-input label {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(242, 243, 255, 0.9);
	}

	.answer-input input {
		padding: 0.75rem 1rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(245, 158, 11, 0.3);
		border-radius: 8px;
		color: #f2f3ff;
		font-size: 0.9rem;
	}

	.answer-input input:focus {
		outline: none;
		border-color: #f59e0b;
	}

	.answer-input input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-btn {
		background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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
		box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
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
