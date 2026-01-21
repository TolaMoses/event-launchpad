<script lang="ts">
	import { onMount } from 'svelte';

	export let config: {
		questions?: Array<{
			question: string;
			type: 'multiple_choice' | 'short_answer';
			options?: string[];
			correctAnswer: string;
		}>;
		quiz?: {
			questions?: Array<any>;
		};
	};
	export let readonly = false;
	export let onComplete: (() => Promise<void>) | undefined = undefined;
	export let eventEnded = false; // Pass this from parent to show score

	let answers: Record<number, string> = {};
	let submitting = false;
	let error = '';
	let score: number | null = null;
	let submitted = false;
	let questions: any[] = [];

	onMount(() => {
		console.log('QuizTask config:', JSON.stringify(config, null, 2));
		// Handle different possible config structures
		if (config.questions) {
			questions = config.questions;
		} else if (config.quiz?.questions) {
			questions = config.quiz.questions;
		}
		
		// Transform old format (prompt) to new format (question) if needed
		questions = questions.map(q => {
			if (q && typeof q === 'object') {
				return {
					...q,
					question: q.question || q.prompt || '',
					correctAnswer: q.correctAnswer || q.correctAnswerText || '',
					type: q.type || 'short_answer',
					options: Array.isArray(q.options) ? q.options : []
				};
			}
			return q;
		});
		
		console.log('Parsed questions:', questions);
	});

	async function handleSubmit() {
		if (readonly || !onComplete) return;

		const allAnswered = questions?.every((_, idx) => answers[idx]?.trim());
		if (!allAnswered) {
			error = 'Please answer all questions';
			return;
		}

		submitting = true;
		error = '';

		try {
			// Calculate score
			let correct = 0;
			questions?.forEach((q, idx) => {
				if (answers[idx]?.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim()) {
					correct++;
				}
			});
			score = Math.round((correct / (questions?.length || 1)) * 100);
			
			await onComplete();
			submitted = true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Submission failed';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="quiz-task">
	<div class="task-header">
		<div class="task-icon">❓</div>
		<div>
			<h4>Quiz/Trivia</h4>
			<p class="task-instructions">{questions?.length || 0} question{questions?.length !== 1 ? 's' : ''}</p>
		</div>
	</div>

	<div class="task-body">
		{#if eventEnded && score !== null}
			<div class="score-display">
				<h3>Your Score: {score}%</h3>
				<p>{score >= 70 ? '🎉 Great job!' : score >= 50 ? '👍 Good effort!' : '💪 Keep trying!'}</p>
			</div>
		{:else if submitted && !eventEnded}
			<p class="submitted-text">Quiz submitted! Score will be revealed when the event ends.</p>
		{:else if !questions || questions.length === 0}
			<p class="error-message">No questions configured for this quiz.</p>
		{:else}
			{#each questions as question, idx}
				<div class="question-block">
					{#if typeof question === 'object' && question.question}
						<p class="question-text"><strong>Q{idx + 1}.</strong> {String(question.question)}</p>
						
						{#if question.type === 'multiple_choice' && Array.isArray(question.options)}
							<div class="options-list">
								{#each question.options as option}
									<label class="option-label">
										<input 
											type="radio" 
											name="question-{idx}"
											value={typeof option === 'string' ? option : (option.text || option.value || String(option))}
											bind:group={answers[idx]}
											disabled={readonly || submitted}
										/>
										<span>{typeof option === 'string' ? option : (option.text || option.value || String(option))}</span>
									</label>
								{/each}
							</div>
						{:else if question.type === 'short_answer' || !question.type}
							<input 
								type="text"
								class="short-answer"
								placeholder="Your answer..."
								bind:value={answers[idx]}
								disabled={readonly || submitted}
							/>
						{:else}
							<p class="error-message">Invalid question type: {question.type}</p>
						{/if}
					{:else}
						<p class="error-message">Question {idx + 1} is not properly configured</p>
					{/if}
				</div>
			{/each}

			{#if !readonly && !submitted}
				<button class="submit-btn" on:click={handleSubmit} disabled={submitting}>
					{submitting ? 'Submitting...' : 'Submit Answers'}
				</button>
			{/if}

			{#if error}
				<p class="error-message">{error}</p>
			{/if}
		{/if}
	</div>
</div>

<style>
	.quiz-task {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 1.5rem;
		background: rgba(236, 72, 153, 0.05);
		border: 1px solid rgba(236, 72, 153, 0.2);
		border-radius: 12px;
	}

	.task-header {
		display: flex;
		align-items: center;
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

	.task-body {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.question-block {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 8px;
	}

	.question-text {
		font-size: 0.9rem;
		color: #f2f3ff;
		margin: 0;
	}

	.options-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.option-label {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(236, 72, 153, 0.2);
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.option-label:hover {
		background: rgba(236, 72, 153, 0.1);
		border-color: rgba(236, 72, 153, 0.4);
	}

	.option-label input[type="radio"] {
		cursor: pointer;
	}

	.option-label span {
		color: rgba(242, 243, 255, 0.9);
		font-size: 0.875rem;
	}

	.short-answer {
		padding: 0.75rem 1rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(236, 72, 153, 0.3);
		border-radius: 8px;
		color: #f2f3ff;
		font-size: 0.9rem;
	}

	.short-answer:focus {
		outline: none;
		border-color: #ec4899;
	}

	.short-answer:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-btn {
		background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
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
		box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.score-display {
		text-align: center;
		padding: 2rem;
		background: rgba(16, 185, 129, 0.1);
		border: 2px solid rgba(16, 185, 129, 0.3);
		border-radius: 12px;
	}

	.score-display h3 {
		font-size: 2rem;
		color: #10b981;
		margin: 0 0 0.5rem;
	}

	.score-display p {
		font-size: 1.125rem;
		color: rgba(242, 243, 255, 0.8);
		margin: 0;
	}

	.submitted-text {
		color: #10b981;
		font-weight: 600;
		text-align: center;
		padding: 1rem;
		background: rgba(16, 185, 129, 0.1);
		border-radius: 8px;
		margin: 0;
	}

	.error-message {
		color: #ff6b6b;
		font-size: 0.85rem;
		margin: 0;
	}
</style>
