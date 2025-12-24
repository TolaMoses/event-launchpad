<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	
	export let eventId: string;
	export let existingTasks: any[] = [];
	export let pointSystemEnabled: boolean = false;

	const dispatch = createEventDispatcher();

	let tasks = existingTasks.length > 0 ? JSON.parse(JSON.stringify(existingTasks)) : [];
	let saving = false;
	let error = '';
	let selectedTaskType = '';
	let creatingTaskIndex: number | null = null;

	// Import task components (you'll need to adjust paths based on your structure)
	const taskOptions = [
		{ value: 'twitter_follow', label: 'Twitter Follow' },
		{ value: 'twitter_retweet', label: 'Twitter Retweet' },
		{ value: 'twitter_like', label: 'Twitter Like' },
		{ value: 'discord_join', label: 'Discord Join' },
		{ value: 'telegram_join', label: 'Telegram Join' },
		{ value: 'visit_website', label: 'Visit Website' },
		{ value: 'custom', label: 'Custom Task' }
	];

	function addTask() {
		if (!selectedTaskType) return;
		
		const newTask = {
			id: crypto.randomUUID(),
			type: selectedTaskType,
			config: {},
			points: pointSystemEnabled ? 10 : null
		};
		
		tasks = [...tasks, newTask];
		selectedTaskType = '';
	}

	function removeTask(index: number) {
		tasks = tasks.filter((_, i) => i !== index);
	}

	function updateTaskPoints(index: number, points: number) {
		tasks[index].points = points;
	}

	async function saveTasks() {
		saving = true;
		error = '';

		const { error: updateError } = await supabase
			.from('events')
			.update({ 
				tasks: tasks,
				setup_progress: supabase.raw(`
					jsonb_set(
						COALESCE(setup_progress, '{}'::jsonb),
						'{tasks}',
						'100'::jsonb
					)
				`)
			})
			.eq('id', eventId);

		if (updateError) {
			error = 'Failed to save tasks';
			saving = false;
			return;
		}

		saving = false;
		dispatch('saved', { tasks });
		dispatch('close');
	}

	function close() {
		dispatch('close');
	}
</script>

<div class="modal-overlay" on:click={close}>
	<div class="modal-content" on:click|stopPropagation>
		<div class="modal-header">
			<h2>📋 Event Tasks</h2>
			<button class="close-btn" on:click={close}>✕</button>
		</div>

		<div class="modal-body">
			<p class="section-description">
				Add tasks that participants need to complete. {#if pointSystemEnabled}Assign point values to each task.{/if}
			</p>

			<!-- Add Task Section -->
			<div class="add-task-section">
				<div class="task-selector">
					<select bind:value={selectedTaskType}>
						<option value="">Select task type...</option>
						{#each taskOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					<button class="add-btn" on:click={addTask} disabled={!selectedTaskType}>
						+ Add Task
					</button>
				</div>
			</div>

			<!-- Tasks List -->
			<div class="tasks-list">
				{#if tasks.length === 0}
					<div class="empty-state">
						<p>No tasks added yet. Select a task type above to get started.</p>
					</div>
				{:else}
					{#each tasks as task, index (task.id)}
						<div class="task-item">
							<div class="task-header">
								<div class="task-info">
									<span class="task-number">#{index + 1}</span>
									<span class="task-type">{taskOptions.find(t => t.value === task.type)?.label || task.type}</span>
								</div>
								<button class="remove-btn" on:click={() => removeTask(index)}>
									Remove
								</button>
							</div>
							
							{#if pointSystemEnabled}
								<div class="task-points">
									<label for="points-{index}">Point Value:</label>
									<input
										id="points-{index}"
										type="number"
										min="0"
										step="1"
										value={task.points || 0}
										on:input={(e) => updateTaskPoints(index, Number(e.currentTarget.value))}
										placeholder="Enter points"
									/>
								</div>
							{/if}

							<div class="task-config">
								<p class="config-label">Configuration:</p>
								<pre>{JSON.stringify(task.config, null, 2)}</pre>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			{#if error}
				<div class="error-message">{error}</div>
			{/if}
		</div>

		<div class="modal-footer">
			<button class="secondary-btn" on:click={close}>Cancel</button>
			<button class="primary-btn" on:click={saveTasks} disabled={saving || tasks.length === 0}>
				{saving ? 'Saving...' : 'Save Tasks'}
			</button>
		</div>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
		animation: fadeIn 0.2s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.modal-content {
		background: rgba(18, 20, 38, 0.98);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		max-width: 800px;
		width: 100%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		animation: slideUp 0.3s ease;
	}

	@keyframes slideUp {
		from { transform: translateY(20px); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
		color: #f2f3ff;
	}

	.close-btn {
		background: none;
		border: none;
		color: rgba(242, 243, 255, 0.6);
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		transition: color 0.2s ease;
	}

	.close-btn:hover {
		color: #f2f3ff;
	}

	.modal-body {
		padding: 2rem;
		overflow-y: auto;
		flex: 1;
	}

	.section-description {
		margin: 0 0 1.5rem;
		color: rgba(242, 243, 255, 0.7);
		font-size: 0.95rem;
	}

	.add-task-section {
		margin-bottom: 2rem;
	}

	.task-selector {
		display: flex;
		gap: 1rem;
	}

	.task-selector select {
		flex: 1;
		background: rgba(26, 28, 45, 0.88);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 12px;
		padding: 0.75rem 1rem;
		font-size: 0.95rem;
		color: #f6f6ff;
	}

	.add-btn {
		background: rgba(111, 160, 255, 0.2);
		color: #6fa0ff;
		border: 1px solid rgba(111, 160, 255, 0.3);
		border-radius: 10px;
		padding: 0.75rem 1.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.add-btn:hover:not(:disabled) {
		background: rgba(111, 160, 255, 0.3);
	}

	.add-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.tasks-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 2rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px dashed rgba(255, 255, 255, 0.1);
		border-radius: 12px;
	}

	.empty-state p {
		margin: 0;
		color: rgba(242, 243, 255, 0.6);
	}

	.task-item {
		background: rgba(12, 14, 30, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		padding: 1.25rem;
	}

	.task-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.task-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.task-number {
		background: rgba(111, 160, 255, 0.2);
		color: #6fa0ff;
		padding: 0.25rem 0.75rem;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.task-type {
		font-weight: 600;
		color: #f2f3ff;
	}

	.remove-btn {
		background: rgba(218, 30, 40, 0.12);
		border: 1px solid rgba(218, 30, 40, 0.3);
		color: #ff9b9b;
		border-radius: 8px;
		padding: 0.5rem 1rem;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.remove-btn:hover {
		background: rgba(218, 30, 40, 0.2);
	}

	.task-points {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
		padding: 0.75rem;
		background: rgba(111, 160, 255, 0.08);
		border-radius: 8px;
	}

	.task-points label {
		font-weight: 600;
		color: #6fa0ff;
		font-size: 0.9rem;
	}

	.task-points input {
		background: rgba(26, 28, 45, 0.88);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 8px;
		padding: 0.5rem 0.75rem;
		font-size: 0.9rem;
		color: #f6f6ff;
		width: 120px;
	}

	.task-config {
		margin-top: 1rem;
	}

	.config-label {
		margin: 0 0 0.5rem;
		font-size: 0.85rem;
		color: rgba(242, 243, 255, 0.7);
		font-weight: 600;
	}

	.task-config pre {
		margin: 0;
		padding: 0.75rem;
		background: rgba(8, 9, 22, 0.85);
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.05);
		font-size: 0.85rem;
		color: rgba(242, 243, 255, 0.8);
		overflow-x: auto;
	}

	.error-message {
		margin-top: 1rem;
		padding: 1rem;
		background: rgba(218, 30, 40, 0.12);
		border: 1px solid rgba(218, 30, 40, 0.3);
		border-radius: 8px;
		color: #ff9b9b;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding: 1.5rem 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.secondary-btn {
		background: rgba(255, 255, 255, 0.08);
		color: #f2f3ff;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 10px;
		padding: 0.75rem 1.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.secondary-btn:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	.primary-btn {
		background: linear-gradient(135deg, #6fa0ff 0%, #5a8dff 100%);
		color: white;
		border: none;
		border-radius: 10px;
		padding: 0.75rem 2rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.primary-btn:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(111, 160, 255, 0.4);
	}

	.primary-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 768px) {
		.modal-content {
			max-width: 100%;
			max-height: 100vh;
			border-radius: 0;
		}

		.task-selector {
			flex-direction: column;
		}

		.task-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}
	}
</style>
