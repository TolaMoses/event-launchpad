<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';

	type Event = {
		id: string;
		title: string;
		description: string;
		video_url: string | null;
		logo_url: string | null;
		banner_url: string | null;
		start_time: string;
		end_time: string;
		num_winners: number | null;
		prize_details: any;
		tasks: any[];
		status: string;
		created_by: string;
		created_at: string;
	};

	type Participant = {
		id: string;
		user_id: string;
		joined_at: string;
		users: {
			wallet_address: string;
			username: string | null;
		};
	};

	type TaskSubmission = {
		id: string;
		user_id: string;
		task_id: string;
		verified: boolean;
		score: number | null;
		created_at: string;
	};

	let event: Event | null = null;
	let participants: Participant[] = [];
	let submissions: TaskSubmission[] = [];
	let loading = true;
	let userId: string | null = null;
	let isCreator = false;

	$: eventId = $page.params.id;

	onMount(async () => {
		const { data: { user } } = await supabase.auth.getUser();
		
		if (!user) {
			goto('/');
			return;
		}

		userId = user.id;

		// Fetch event details
		const { data: eventData, error: eventError } = await supabase
			.from('events')
			.select('*')
			.eq('id', eventId)
			.single();

		if (eventError || !eventData) {
			goto('/dashboard');
			return;
		}

		event = eventData;

		// Check if user is the creator
		if (event.created_by !== userId) {
			goto('/dashboard');
			return;
		}

		isCreator = true;

		// Fetch participants
		const { data: participantsData } = await supabase
			.from('event_participants')
			.select('*, users(wallet_address, username)')
			.eq('event_id', eventId)
			.order('joined_at', { ascending: false });

		if (participantsData) {
			participants = participantsData;
		}

		// Fetch task submissions
		const { data: submissionsData } = await supabase
			.from('task_submissions')
			.select('*')
			.in('task_id', event.tasks.map((t: any) => t.id));

		if (submissionsData) {
			submissions = submissionsData;
		}

		loading = false;
	});

	function getStatusBadge(status: string): { text: string; color: string } {
		const badges: Record<string, { text: string; color: string }> = {
			draft: { text: 'Draft', color: '#6c757d' },
			active: { text: 'Active', color: '#28a745' },
			ended: { text: 'Ended', color: '#dc3545' },
			cancelled: { text: 'Cancelled', color: '#ffc107' }
		};
		return badges[status] || { text: status, color: '#6c757d' };
	}

	function getCompletionRate(): number {
		if (!event || participants.length === 0) return 0;
		const totalTasks = event.tasks.length;
		const verifiedSubmissions = submissions.filter(s => s.verified).length;
		const maxPossible = participants.length * totalTasks;
		return maxPossible > 0 ? Math.round((verifiedSubmissions / maxPossible) * 100) : 0;
	}

	function getTaskCompletionStats(taskId: string): { completed: number; total: number } {
		const taskSubmissions = submissions.filter(s => s.task_id === taskId && s.verified);
		return {
			completed: taskSubmissions.length,
			total: participants.length
		};
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleString();
	}

	function shortenAddress(address: string): string {
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	}
</script>

<div class="stats-container">
	{#if loading}
		<div class="loading">Loading event stats...</div>
	{:else if event}
		<div class="stats-header">
			<button class="back-btn" on:click={() => goto('/dashboard')}>
				← Back to Dashboard
			</button>
			<div class="header-content">
				<div class="event-title-section">
					<img src={event.logo_url || '/icons/event-logo.svg'} alt={event.title} class="event-logo" />
					<div>
						<h1>{event.title}</h1>
						<span class="status-badge" style="background-color: {getStatusBadge(event.status).color};">
							{getStatusBadge(event.status).text}
						</span>
					</div>
				</div>
			</div>
		</div>

		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-icon">👥</div>
				<div class="stat-content">
					<h3>Participants</h3>
					<p class="stat-value">{participants.length}</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon">✅</div>
				<div class="stat-content">
					<h3>Completion Rate</h3>
					<p class="stat-value">{getCompletionRate()}%</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon">📝</div>
				<div class="stat-content">
					<h3>Total Tasks</h3>
					<p class="stat-value">{event.tasks.length}</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon">🎁</div>
				<div class="stat-content">
					<h3>Prize Type</h3>
					<p class="stat-value">{event.prize_details.type}</p>
				</div>
			</div>
		</div>

		<div class="section">
			<h2>Tasks Overview</h2>
			<div class="tasks-list">
				{#each event.tasks as task, index}
					{@const stats = getTaskCompletionStats(task.id)}
					<div class="task-item">
						<div class="task-header">
							<span class="task-number">#{index + 1}</span>
							<span class="task-type">{task.type}</span>
						</div>
						<div class="task-progress">
							<div class="progress-bar">
								<div 
									class="progress-fill" 
									style="width: {stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%"
								></div>
							</div>
							<span class="progress-text">{stats.completed} / {stats.total} completed</span>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="section">
			<h2>Participants List</h2>
			{#if participants.length > 0}
				<div class="participants-table">
					<table>
						<thead>
							<tr>
								<th>Wallet Address</th>
								<th>Username</th>
								<th>Joined At</th>
							</tr>
						</thead>
						<tbody>
							{#each participants as participant}
								<tr>
									<td class="wallet-cell">{shortenAddress(participant.users.wallet_address)}</td>
									<td>{participant.users.username || '—'}</td>
									<td>{formatDate(participant.joined_at)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<div class="empty-state">
					<p>No participants yet</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.stats-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.loading {
		text-align: center;
		padding: 4rem 0;
		font-size: 1.2rem;
		color: rgba(242, 243, 255, 0.6);
	}

	.stats-header {
		margin-bottom: 2rem;
	}

	.back-btn {
		background: rgba(255, 255, 255, 0.08);
		color: #f2f3ff;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		padding: 0.75rem 1.5rem;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		margin-bottom: 1.5rem;
		transition: background 0.2s ease;
	}

	.back-btn:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.event-title-section {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.event-logo {
		width: 80px;
		height: 80px;
		border-radius: 12px;
		object-fit: cover;
		background: rgba(255, 255, 255, 0.08);
	}

	.event-title-section h1 {
		font-size: 2rem;
		font-weight: 700;
		color: #f2f3ff;
		margin: 0 0 0.5rem;
	}

	.status-badge {
		display: inline-block;
		padding: 0.35rem 0.85rem;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 600;
		color: white;
		text-transform: uppercase;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin-bottom: 3rem;
	}

	.stat-card {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.stat-icon {
		font-size: 2.5rem;
	}

	.stat-content h3 {
		font-size: 0.9rem;
		font-weight: 600;
		color: rgba(242, 243, 255, 0.7);
		margin: 0 0 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: #f2f3ff;
		margin: 0;
	}

	.section {
		margin-bottom: 3rem;
	}

	.section h2 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #f2f3ff;
		margin: 0 0 1.5rem;
	}

	.tasks-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.task-item {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 1.25rem;
	}

	.task-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.task-number {
		background: rgba(111, 160, 255, 0.2);
		color: #6fa0ff;
		padding: 0.25rem 0.75rem;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.task-type {
		color: #f2f3ff;
		font-weight: 600;
		text-transform: capitalize;
	}

	.task-progress {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.progress-bar {
		flex: 1;
		height: 8px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(135deg, #6fa0ff 0%, #5a8dff 100%);
		transition: width 0.3s ease;
	}

	.progress-text {
		color: rgba(242, 243, 255, 0.7);
		font-size: 0.9rem;
		font-weight: 600;
		min-width: 120px;
		text-align: right;
	}

	.participants-table {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		overflow: hidden;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	thead {
		background: rgba(255, 255, 255, 0.05);
	}

	th {
		text-align: left;
		padding: 1rem 1.5rem;
		font-weight: 600;
		color: rgba(242, 243, 255, 0.9);
		text-transform: uppercase;
		font-size: 0.85rem;
		letter-spacing: 0.5px;
	}

	td {
		padding: 1rem 1.5rem;
		color: rgba(242, 243, 255, 0.8);
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}

	.wallet-cell {
		font-family: 'Courier New', monospace;
		color: #6fa0ff;
	}

	tbody tr:hover {
		background: rgba(255, 255, 255, 0.02);
	}

	.empty-state {
		text-align: center;
		padding: 3rem 2rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px dashed rgba(255, 255, 255, 0.1);
		border-radius: 12px;
	}

	.empty-state p {
		font-size: 1.1rem;
		color: rgba(242, 243, 255, 0.6);
		margin: 0;
	}

	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}

		.participants-table {
			overflow-x: auto;
		}

		table {
			min-width: 600px;
		}
	}
</style>
