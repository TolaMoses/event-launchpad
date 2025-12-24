<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';
	import TasksModal from '$lib/components/TasksModal.svelte';
	import RewardsModal from '$lib/components/RewardsModal.svelte';
	import RolesModal from '$lib/components/RolesModal.svelte';

	let eventId: string = $page.params.id || '';
	let event: any = null;
	let loading = true;
	let showTasksModal = false;
	let showRewardsModal = false;
	let showRolesModal = false;
	let saving = false;
	let error = '';

	// Setup sections with completion tracking
	let sections = [
		{ id: 'tasks', name: 'Event Tasks', icon: '📋', complete: false, description: 'Add tasks for participants to complete' },
		{ id: 'rewards', name: 'Reward Configuration', icon: '🎁', complete: false, description: 'Configure prizes and rewards' },
		{ id: 'roles', name: 'Roles & Permissions', icon: '👥', complete: false, description: 'Set up team roles and permissions' }
	];

	onMount(async () => {
		await loadEvent();
	});

	async function loadEvent() {
		loading = true;
		const { data, error: fetchError } = await supabase
			.from('events')
			.select('*')
			.eq('id', eventId)
			.single();

		if (fetchError || !data) {
			error = 'Failed to load event';
			loading = false;
			return;
		}

		event = data;
		
		// Update section completion status
		sections[0].complete = event.tasks && event.tasks.length > 0;
		sections[1].complete = (event.reward_types && event.reward_types.length > 0) || (event.point_system && event.point_system.enabled);
		sections[2].complete = event.roles_permissions !== null;

		loading = false;
	}

	function handleTasksSaved() {
		loadEvent();
		showTasksModal = false;
	}

	function handleRewardsSaved() {
		loadEvent();
		showRewardsModal = false;
	}

	function handleRolesSaved() {
		loadEvent();
		showRolesModal = false;
	}

	function openSection(sectionId: string) {
		if (sectionId === 'tasks') {
			showTasksModal = true;
		} else if (sectionId === 'rewards') {
			showRewardsModal = true;
		} else if (sectionId === 'roles') {
			showRolesModal = true;
		}
	}

	function getOverallProgress(): number {
		const completed = sections.filter(s => s.complete).length;
		return Math.round((completed / sections.length) * 100);
	}

	async function submitForReview() {
		if (getOverallProgress() < 100) {
			error = 'Please complete all sections before submitting for review';
			return;
		}

		saving = true;
		const { error: updateError } = await supabase
			.from('events')
			.update({ status: 'submitted' })
			.eq('id', eventId);

		if (updateError) {
			error = 'Failed to submit event for review';
			saving = false;
			return;
		}

		saving = false;
		goto('/dashboard');
	}
</script>

{#if loading}
	<div class="loading-container">
		<div class="spinner"></div>
		<p>Loading event setup...</p>
	</div>
{:else if event}
	<div class="setup-container">
		<div class="setup-header">
			<button class="back-btn" on:click={() => goto('/dashboard')}>
				← Back to Dashboard
			</button>
			<div class="header-content">
				<h1>{event.title}</h1>
				<span class="event-type-badge">🏘️ Community Event</span>
			</div>
		</div>

		<div class="progress-overview">
			<div class="progress-info">
				<h2>Setup Progress</h2>
				<span class="progress-percent">{getOverallProgress()}%</span>
			</div>
			<div class="progress-bar-large">
				<div class="progress-fill-large" style="width: {getOverallProgress()}%"></div>
			</div>
			<p class="progress-description">
				Complete all sections to submit your event for review
			</p>
		</div>

		<div class="sections-grid">
			{#each sections as section}
				<button 
					class="section-card" 
					class:complete={section.complete}
					on:click={() => openSection(section.id)}
				>
					<div class="section-icon">{section.icon}</div>
					<div class="section-content">
						<h3>{section.name}</h3>
						<p>{section.description}</p>
					</div>
					<div class="section-status">
						{#if section.complete}
							<span class="status-badge complete">✓ Complete</span>
						{:else}
							<span class="status-badge incomplete">○ Incomplete</span>
						{/if}
					</div>
				</button>
			{/each}
		</div>

		<div class="submit-section">
			<button 
				class="submit-btn" 
				disabled={getOverallProgress() < 100 || saving}
				on:click={submitForReview}
			>
				{saving ? 'Submitting...' : 'Submit for Review'}
			</button>
			{#if getOverallProgress() < 100}
				<p class="submit-hint">Complete all sections to enable submission</p>
			{/if}
			{#if error}
				<p class="error-message">{error}</p>
			{/if}
		</div>
	</div>
{/if}

<!-- Modals -->
{#if showTasksModal && event}
	<TasksModal
		eventId={eventId}
		existingTasks={event.tasks || []}
		pointSystemEnabled={event.point_system?.enabled || false}
		on:saved={handleTasksSaved}
		on:close={() => showTasksModal = false}
	/>
{/if}

{#if showRewardsModal && event}
	<RewardsModal
		eventId={eventId}
		existingRewards={event.reward_types || []}
		existingPointSystem={event.point_system}
		on:saved={handleRewardsSaved}
		on:close={() => showRewardsModal = false}
	/>
{/if}

{#if showRolesModal && event}
	<RolesModal
		eventId={eventId}
		existingRoles={event.roles_permissions}
		on:saved={handleRolesSaved}
		on:close={() => showRolesModal = false}
	/>
{/if}

<style>
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		gap: 1rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid rgba(111, 160, 255, 0.2);
		border-top-color: #6fa0ff;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.setup-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.setup-header {
		margin-bottom: 2rem;
	}

	.back-btn {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #f2f3ff;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.95rem;
		margin-bottom: 1rem;
		transition: all 0.2s ease;
	}

	.back-btn:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.header-content h1 {
		margin: 0;
		font-size: 2rem;
		color: #f2f3ff;
	}

	.event-type-badge {
		padding: 0.5rem 1rem;
		background: rgba(156, 123, 255, 0.2);
		color: #9c7bff;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.progress-overview {
		background: rgba(18, 20, 38, 0.82);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 2rem;
		margin-bottom: 2rem;
	}

	.progress-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.progress-info h2 {
		margin: 0;
		font-size: 1.5rem;
		color: #f2f3ff;
	}

	.progress-percent {
		font-size: 2rem;
		font-weight: 700;
		color: #6fa0ff;
	}

	.progress-bar-large {
		height: 12px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		overflow: hidden;
		margin-bottom: 0.75rem;
	}

	.progress-fill-large {
		height: 100%;
		background: linear-gradient(135deg, #6fa0ff 0%, #5a8dff 100%);
		transition: width 0.5s ease;
	}

	.progress-description {
		margin: 0;
		color: rgba(242, 243, 255, 0.7);
		font-size: 0.95rem;
	}

	.sections-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.section-card {
		background: rgba(18, 20, 38, 0.82);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 2rem;
		cursor: pointer;
		transition: all 0.3s ease;
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section-card:hover {
		border-color: rgba(111, 160, 255, 0.4);
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
	}

	.section-card.complete {
		border-color: rgba(40, 167, 69, 0.4);
		background: rgba(40, 167, 69, 0.05);
	}

	.section-icon {
		font-size: 3rem;
	}

	.section-content h3 {
		margin: 0 0 0.5rem;
		font-size: 1.3rem;
		color: #f2f3ff;
	}

	.section-content p {
		margin: 0;
		color: rgba(242, 243, 255, 0.7);
		font-size: 0.95rem;
	}

	.section-status {
		margin-top: auto;
	}

	.status-badge {
		display: inline-block;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.status-badge.complete {
		background: rgba(40, 167, 69, 0.2);
		color: #28a745;
	}

	.status-badge.incomplete {
		background: rgba(255, 193, 7, 0.2);
		color: #ffc107;
	}

	.submit-section {
		text-align: center;
		padding: 2rem;
		background: rgba(18, 20, 38, 0.82);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
	}

	.submit-btn {
		background: linear-gradient(135deg, #6fa0ff 0%, #5a8dff 100%);
		color: white;
		border: none;
		border-radius: 12px;
		padding: 1rem 3rem;
		font-size: 1.1rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.submit-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(111, 160, 255, 0.4);
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-hint {
		margin: 1rem 0 0;
		color: rgba(242, 243, 255, 0.6);
		font-size: 0.9rem;
	}

	.error-message {
		margin: 1rem 0 0;
		color: #ff6b6b;
		font-size: 0.95rem;
	}

	@media (max-width: 768px) {
		.setup-container {
			padding: 1rem;
		}

		.header-content h1 {
			font-size: 1.5rem;
		}

		.sections-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
