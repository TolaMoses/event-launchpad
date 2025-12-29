<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';

	type Event = {
		id: string;
		event_type: 'quick_event' | 'community';
		title: string;
		description: string;
		logo_url: string | null;
		banner_url: string | null;
		start_time: string;
		end_time: string;
		num_winners: number | null;
		prize_details: {
			type: string;
			[key: string]: any;
		} | null;
		tasks: Array<{
			id: string;
			type: string;
			config: any;
		}>;
		setup_progress: {
			tasks: number;
			rewards: number;
		} | null;
		status: string;
		created_by: string;
		created_at: string;
	};

	let myEvents: Event[] = [];
	let participatedEvents: Event[] = [];
	let loading = true;
	let userId: string | null = null;

	onMount(async () => {
		const { data: { user } } = await supabase.auth.getUser();
		
		if (!user) {
			goto('/');
			return;
		}

		userId = user.id;

		// Fetch events created by user
		const { data: createdEvents } = await supabase
			.from('events')
			.select('*')
			.eq('created_by', user.id)
			.order('created_at', { ascending: false });

		if (createdEvents) {
			myEvents = createdEvents;
		}

		// Fetch events user has participated in
		const { data: participations } = await supabase
			.from('event_participants')
			.select('event_id')
			.eq('user_id', user.id);

		if (participations && participations.length > 0) {
			const eventIds = participations.map(p => p.event_id);
			const { data: joinedEvents } = await supabase
				.from('events')
				.select('*')
				.in('id', eventIds)
				.order('created_at', { ascending: false });

			if (joinedEvents) {
				participatedEvents = joinedEvents;
			}
		}

		loading = false;
	});

	function getRewardIcon(prizeType: string): string {
		if (prizeType === 'Token' || prizeType === 'ETH') {
			return '/icons/dollar-bag.svg';
		} else if (prizeType === 'Voucher') {
			return '/icons/voucher.svg';
		} else {
			return '/icons/gift.svg';
		}
	}

	function getTimeRemaining(endTime: string): string {
		const now = new Date();
		const end = new Date(endTime);
		const diff = end.getTime() - now.getTime();

		if (diff < 0) return 'Ended';

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

		if (days > 0) return `${days}d left`;
		if (hours > 0) return `${hours}h left`;
	}

	function getStatusBadge(status: string): { text: string; color: string } {
		const badges: Record<string, { text: string; color: string }> = {
			draft: { text: 'Draft', color: '#6c757d' },
			submitted: { text: 'Submitted', color: '#ffc107' },
			review: { text: 'In Review', color: '#ffa500' },
			approved: { text: 'Approved', color: '#28a745' },
			rejected: { text: 'Rejected', color: '#dc3545' },
			active: { text: 'Active', color: '#28a745' },
			ended: { text: 'Ended', color: '#dc3545' },
			cancelled: { text: 'Cancelled', color: '#6c757d' }
		};
		return badges[status] || { text: status, color: '#6c757d' };
	}
{{ ... }}

	function getSetupProgress(event: Event): number {
		if (event.event_type !== 'community' || !event.setup_progress) return 100;
		const { tasks, rewards } = event.setup_progress;
		return Math.round((tasks + rewards) / 2);
	}

	function viewEventStats(eventId: string) {
		goto(`/dashboard/events/${eventId}`);
	}

	function viewEventDetails(eventId: string) {
		goto(`/events/${eventId}`);
	}
</script>

<div class="dashboard-container">
	<div class="dashboard-header">
		<h1>Dashboard</h1>
		<button class="primary-btn" on:click={() => goto('/projects/create-event')}>
			+ Create Event
		</button>
	</div>

	{#if loading}
		<div class="loading">Loading your events...</div>
	{:else}
		<!-- My Events Section -->
		<section class="dashboard-section">
			<h2>My Events</h2>
			{#if myEvents.length > 0}
				<div class="events-grid">
					{#each myEvents as event (event.id)}
						<div class="event-card" on:click={() => viewEventStats(event.id)} role="button" tabindex="0">
							<div class="event-header">
								<div class="event-logo">
									<img src={event.logo_url || '/icons/event-logo.svg'} alt={event.title} />
								</div>
								<div class="event-header-info">
									<h3>{event.title}</h3>
									<div class="badges">
										<span class="type-badge" class:community={event.event_type === 'community'}>
											{event.event_type === 'community' ? '🏘️ Community' : '⚡ Quick Event'}
										</span>
										<span class="status-badge" style="background-color: {getStatusBadge(event.status).color};">
											{getStatusBadge(event.status).text}
										</span>
									</div>
								</div>
							</div>
							<div class="event-meta">
								{#if event.event_type === 'community' && getSetupProgress(event) < 100}
									<div class="setup-progress-section">
										<div class="progress-header">
											<span class="progress-label">Setup Progress</span>
											<span class="progress-percentage">{getSetupProgress(event)}%</span>
										</div>
										<div class="progress-bar-container">
											<div class="progress-bar-fill" style="width: {getSetupProgress(event)}%"></div>
										</div>
										<div class="setup-items">
											<div class="setup-item" class:complete={event.setup_progress?.tasks === 100}>
												{event.setup_progress?.tasks === 100 ? '✓' : '○'} Add Event Tasks
											</div>
											<div class="setup-item" class:complete={event.setup_progress?.rewards === 100}>
												{event.setup_progress?.rewards === 100 ? '✓' : '○'} Reward Settings
											</div>
										</div>
									</div>
								{/if}
								<div class="meta-item">
									<span class="meta-label">Prize:</span>
									<div class="meta-value">
										{#if event.prize_details}
											<img src={getRewardIcon(event.prize_details.type)} alt="Reward" class="reward-icon-small" />
											<span>{event.prize_details.type}</span>
										{:else}
											<span class="not-set">Not set</span>
										{/if}
									</div>
								</div>
								<div class="meta-item">
									<span class="meta-label">Time:</span>
									<span class="meta-value">{getTimeRemaining(event.end_time)}</span>
								</div>
								<div class="meta-item">
									<span class="meta-label">Winners:</span>
									<span class="meta-value">{event.num_winners || 'All'}</span>
								</div>
							</div>
							<div class="event-actions">
								{#if event.event_type === 'community' && getSetupProgress(event) < 100}
									<button class="primary-btn small" on:click|stopPropagation={() => goto(`/projects/setup-event/${event.id}`)}>
										Continue Setup
									</button>
								{:else}
									<button class="secondary-btn small" on:click|stopPropagation={() => viewEventStats(event.id)}>
										View Stats
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty-section">
					<p>You haven't created any events yet.</p>
					<button class="primary-btn" on:click={() => goto('/projects/create-event')}>
						Create Your First Event
					</button>
				</div>
			{/if}
		</section>

		<!-- Participated Events Section -->
		<section class="dashboard-section">
			<h2>Participated Events</h2>
			{#if participatedEvents.length > 0}
				<div class="events-grid">
					{#each participatedEvents as event (event.id)}
						<div class="event-card" on:click={() => viewEventDetails(event.id)} role="button" tabindex="0">
							<div class="event-header">
								<div class="event-logo">
									<img src={event.logo_url || '/icons/event-logo.svg'} alt={event.title} />
								</div>
								<div class="event-header-info">
									<h3>{event.title}</h3>
									<span class="status-badge" style="background-color: {getStatusBadge(event.status).color};">
										{getStatusBadge(event.status).text}
									</span>
								</div>
							</div>
							<div class="event-meta">
								<div class="meta-item">
									<span class="meta-label">Prize:</span>
									<div class="meta-value">
										{#if event.prize_details}
											<img src={getRewardIcon(event.prize_details.type)} alt="Reward" class="reward-icon-small" />
											<span>{event.prize_details.type}</span>
										{:else}
											<span class="not-set">Not set</span>
										{/if}
									</div>
								</div>
								<div class="meta-item">
									<span class="meta-label">Time:</span>
									<span class="meta-value">{getTimeRemaining(event.end_time)}</span>
								</div>
							</div>
							<div class="event-actions">
								<button class="secondary-btn small" on:click|stopPropagation={() => viewEventDetails(event.id)}>
									View Details
								</button>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty-section">
					<p>You haven't joined any events yet.</p>
					<button class="primary-btn" on:click={() => goto('/')}>
						Browse Events
					</button>
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	.dashboard-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 3rem;
	}

	.dashboard-header h1 {
		font-size: 2.5rem;
		font-weight: 700;
		color: #f2f3ff;
		margin: 0;
	}

	.loading {
		text-align: center;
		padding: 4rem 0;
		font-size: 1.2rem;
		color: rgba(242, 243, 255, 0.6);
	}

	.dashboard-section {
		margin-bottom: 4rem;
	}

	.dashboard-section h2 {
		font-size: 1.8rem;
		font-weight: 700;
		color: #f2f3ff;
		margin: 0 0 1.5rem;
	}

	.events-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.event-card {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 1.5rem;
		cursor: pointer;
		transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.event-card:hover {
		transform: translateY(-4px);
		border-color: rgba(111, 160, 255, 0.4);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
	}

	.event-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	.event-logo {
		flex-shrink: 0;
		width: 50px;
		height: 50px;
		border-radius: 8px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.08);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.event-logo img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.event-header-info {
		flex: 1;
		min-width: 0;
	}

	.event-header-info h3 {
		font-size: 1.2rem;
		font-weight: 600;
		color: #f2f3ff;
		margin: 0 0 0.5rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
		text-transform: uppercase;
	}

	.event-meta {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	.meta-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.9rem;
	}

	.meta-label {
		color: rgba(242, 243, 255, 0.6);
		font-weight: 500;
	}

	.meta-value {
		color: #f2f3ff;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.reward-icon-small {
		width: 20px;
		height: 20px;
		object-fit: contain;
	}

	.event-actions {
		display: flex;
		gap: 0.75rem;
	}

	.primary-btn {
		background: linear-gradient(135deg, #6fa0ff 0%, #5a8dff 100%);
		color: white;
		border: none;
		border-radius: 12px;
		padding: 1rem 2rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.primary-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(111, 160, 255, 0.4);
	}

	.secondary-btn {
		background: rgba(255, 255, 255, 0.08);
		color: #f2f3ff;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		padding: 0.75rem 1.5rem;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s ease, border-color 0.2s ease;
		flex: 1;
	}

	.secondary-btn:hover {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.secondary-btn.small {
		padding: 0.6rem 1.2rem;
		font-size: 0.9rem;
	}

	.empty-section {
		text-align: center;
		padding: 3rem 2rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px dashed rgba(255, 255, 255, 0.1);
		border-radius: 12px;
	}

	.empty-section p {
		font-size: 1.1rem;
		color: rgba(242, 243, 255, 0.6);
		margin: 0 0 1.5rem;
	}

	.badges {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.type-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 600;
		background: rgba(111, 160, 255, 0.2);
		color: #6fa0ff;
		text-transform: uppercase;
	}

	.type-badge.community {
		background: rgba(156, 123, 255, 0.2);
		color: #9c7bff;
	}

	.setup-progress-section {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.progress-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.progress-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: rgba(242, 243, 255, 0.9);
	}

	.progress-percentage {
		font-size: 0.85rem;
		font-weight: 700;
		color: #6fa0ff;
	}

	.progress-bar-container {
		height: 6px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		overflow: hidden;
		margin-bottom: 0.75rem;
	}

	.progress-bar-fill {
		height: 100%;
		background: linear-gradient(135deg, #6fa0ff 0%, #5a8dff 100%);
		transition: width 0.3s ease;
	}

	.setup-items {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.setup-item {
		font-size: 0.85rem;
		color: rgba(242, 243, 255, 0.6);
	}

	.setup-item.complete {
		color: #28a745;
		font-weight: 600;
	}

	.not-set {
		color: rgba(242, 243, 255, 0.5);
		font-style: italic;
	}

	@media (max-width: 768px) {
		.dashboard-header {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}

		.dashboard-header h1 {
			font-size: 2rem;
		}

		.events-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
