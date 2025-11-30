<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';

	type Event = {
		id: string;
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
		};
		tasks: Array<{
			id: string;
			type: string;
			config: any;
		}>;
		status: string;
		created_by: string;
	};

	let events: Event[] = [];
	let loading = true;
	let wallet: string | null = null;

	// Group events by category
	$: activeEvents = events.filter(e => e.status === 'active');
	$: upcomingEvents = events.filter(e => e.status === 'draft' && new Date(e.start_time) > new Date());
	$: endedEvents = events.filter(e => e.status === 'ended' || (e.status === 'active' && new Date(e.end_time) < new Date()));

	onMount(async () => {
		// Get logged in wallet
		const { data: { user } } = await supabase.auth.getUser();
		if (user?.user_metadata?.wallet_address) {
			wallet = user.user_metadata.wallet_address;
		}

		// Fetch events
		const { data, error } = await supabase
			.from('events')
			.select('*')
			.order('created_at', { ascending: false });

		if (data) {
			events = data;
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
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		if (days > 0) return `Ends in ${days} day${days > 1 ? 's' : ''}`;
		if (hours > 0) return `Ends in ${hours} hr${hours > 1 ? 's' : ''}`;
		return `Ends in ${minutes} min${minutes > 1 ? 's' : ''}`;
	}

	function getTaskLabel(taskType: string): string {
		const labels: Record<string, string> = {
			twitter: 'Social',
			discord: 'Social',
			telegram: 'Social',
			quiz: 'Quiz',
			game: 'Game',
			puzzle: 'Puzzle',
			treasure_hunt: 'Treasure Hunt',
			irl: 'IRL'
		};
		return labels[taskType] || taskType;
	}

	function getTaskColor(taskType: string): string {
		const colors: Record<string, string> = {
			twitter: '#1DA1F2',
			discord: '#5865F2',
			telegram: '#0088cc',
			quiz: '#FF6B6B',
			game: '#4ECDC4',
			puzzle: '#FFE66D',
			treasure_hunt: '#FF8C42',
			irl: '#A8E6CF'
		};
		return colors[taskType] || '#6c757d';
	}

	function getUniqueTaskTypes(tasks: Array<{ type: string }>): string[] {
		const types = tasks.map(t => t.type);
		return [...new Set(types)];
	}
</script>

<div class="home-container">
	<section class="hero-section">
		<div class="hero-content">
			<h1 class="hero-title">Create. Play. Reward. All in one place.</h1>
			<img src="/images/poker-banner.jpg" alt="Event Banner" class="hero-banner" />
		</div>
	</section>

	{#if loading}
		<div class="loading">Loading events...</div>
	{:else}
		{#if activeEvents.length > 0}
			<section class="events-section">
				<div class="section-header">
					<h2>🔥 Active Events</h2>
					<button class="view-all-btn" on:click={() => goto('/events?filter=active')}>
						View All →
					</button>
				</div>
				<div class="events-scroll">
					{#each activeEvents as event (event.id)}
						<div class="event-card" on:click={() => goto(`/events/${event.id}`)} role="button" tabindex="0">
							<div class="event-main">
								<div class="event-logo">
									<img src={event.logo_url || '/icons/event-logo.svg'} alt={event.title} />
								</div>
								<div class="event-info">
									<h3 class="event-title">{event.title}</h3>
									<p class="event-meta">
										<span class="creator">By Creator</span>
										<span class="separator">•</span>
										<span class="time">{getTimeRemaining(event.end_time)}</span>
									</p>
								</div>
								<div class="reward-icon">
									<img src={getRewardIcon(event.prize_details.type)} alt="Reward" />
								</div>
							</div>
							<div class="event-tags">
								{#each getUniqueTaskTypes(event.tasks) as taskType}
									<span class="tag" style="background-color: {getTaskColor(taskType)};">
										{getTaskLabel(taskType)}
									</span>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		{#if upcomingEvents.length > 0}
			<section class="events-section">
				<div class="section-header">
					<h2>📅 Upcoming Events</h2>
					<button class="view-all-btn" on:click={() => goto('/events?filter=upcoming')}>
						View All →
					</button>
				</div>
				<div class="events-scroll">
					{#each upcomingEvents as event (event.id)}
						<div class="event-card" on:click={() => goto(`/events/${event.id}`)} role="button" tabindex="0">
							<div class="event-main">
								<div class="event-logo">
									<img src={event.logo_url || '/icons/event-logo.svg'} alt={event.title} />
								</div>
								<div class="event-info">
									<h3 class="event-title">{event.title}</h3>
									<p class="event-meta">
										<span class="creator">By Creator</span>
										<span class="separator">•</span>
										<span class="time">Starts {new Date(event.start_time).toLocaleDateString()}</span>
									</p>
								</div>
								<div class="reward-icon">
									<img src={getRewardIcon(event.prize_details.type)} alt="Reward" />
								</div>
							</div>
							<div class="event-tags">
								{#each getUniqueTaskTypes(event.tasks) as taskType}
									<span class="tag" style="background-color: {getTaskColor(taskType)};">
										{getTaskLabel(taskType)}
									</span>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		{#if endedEvents.length > 0}
			<section class="events-section">
				<div class="section-header">
					<h2>✅ Past Events</h2>
					<button class="view-all-btn" on:click={() => goto('/events?filter=ended')}>
						View All →
					</button>
				</div>
				<div class="events-scroll">
					{#each endedEvents as event (event.id)}
						<div class="event-card ended" on:click={() => goto(`/events/${event.id}`)} role="button" tabindex="0">
							<div class="event-main">
								<div class="event-logo">
									<img src={event.logo_url || '/icons/event-logo.svg'} alt={event.title} />
								</div>
								<div class="event-info">
									<h3 class="event-title">{event.title}</h3>
									<p class="event-meta">
										<span class="creator">By Creator</span>
										<span class="separator">•</span>
										<span class="time ended-text">Ended</span>
									</p>
								</div>
								<div class="reward-icon">
									<img src={getRewardIcon(event.prize_details.type)} alt="Reward" />
								</div>
							</div>
							<div class="event-tags">
								{#each getUniqueTaskTypes(event.tasks) as taskType}
									<span class="tag" style="background-color: {getTaskColor(taskType)};">
										{getTaskLabel(taskType)}
									</span>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		{#if events.length === 0}
			<div class="empty-state">
				<h3>No events yet</h3>
				<p>Be the first to create an event!</p>
				<button class="primary-btn" on:click={() => goto('/projects/create-event')}>
					Create Event
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.home-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.hero-section {
		margin-bottom: 3rem;
	}

	.hero-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.hero-title {
		font-size: 2.5rem;
		font-weight: 700;
		color: #f2f3ff;
		margin: 0;
	}

	.hero-banner {
		width: 100%;
		max-height: 400px;
		object-fit: cover;
		border-radius: 16px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
	}

	.loading {
		text-align: center;
		padding: 4rem 0;
		font-size: 1.2rem;
		color: rgba(242, 243, 255, 0.6);
	}

	.events-section {
		margin-bottom: 3rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.section-header h2 {
		font-size: 1.8rem;
		font-weight: 700;
		color: #f2f3ff;
		margin: 0;
	}

	.view-all-btn {
		background: transparent;
		border: none;
		color: #6fa0ff;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: color 0.2s ease;
	}

	.view-all-btn:hover {
		color: #5a8dff;
	}

	.events-scroll {
		display: flex;
		gap: 1.5rem;
		overflow-x: auto;
		padding-bottom: 1rem;
		scrollbar-width: thin;
		scrollbar-color: rgba(111, 160, 255, 0.3) rgba(255, 255, 255, 0.05);
	}

	.events-scroll::-webkit-scrollbar {
		height: 8px;
	}

	.events-scroll::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
	}

	.events-scroll::-webkit-scrollbar-thumb {
		background: rgba(111, 160, 255, 0.3);
		border-radius: 4px;
	}

	.events-scroll::-webkit-scrollbar-thumb:hover {
		background: rgba(111, 160, 255, 0.5);
	}

	.event-card {
		min-width: 400px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 1.25rem;
		cursor: pointer;
		transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.event-card:hover {
		transform: translateY(-4px);
		border-color: rgba(111, 160, 255, 0.4);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
	}

	.event-card.ended {
		opacity: 0.7;
	}

	.event-main {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.event-logo {
		flex-shrink: 0;
		width: 60px;
		height: 60px;
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

	.event-info {
		flex: 1;
		min-width: 0;
	}

	.event-title {
		font-size: 1.1rem;
		font-weight: 600;
		color: #f2f3ff;
		margin: 0 0 0.4rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.event-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		color: rgba(242, 243, 255, 0.6);
		margin: 0;
	}

	.separator {
		color: rgba(242, 243, 255, 0.3);
	}

	.ended-text {
		color: #ff6b6b;
		font-weight: 600;
	}

	.reward-icon {
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.reward-icon img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.event-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.tag {
		padding: 0.35rem 0.75rem;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 600;
		color: white;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
	}

	.empty-state h3 {
		font-size: 1.8rem;
		font-weight: 700;
		color: #f2f3ff;
		margin: 0 0 0.75rem;
	}

	.empty-state p {
		font-size: 1.1rem;
		color: rgba(242, 243, 255, 0.6);
		margin: 0 0 2rem;
	}

	.primary-btn {
		background: linear-gradient(135deg, #6fa0ff 0%, #5a8dff 100%);
		color: white;
		border: none;
		border-radius: 12px;
		padding: 1rem 2rem;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.primary-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(111, 160, 255, 0.4);
	}

	@media (max-width: 768px) {
		.hero-title {
			font-size: 1.8rem;
		}

		.event-card {
			min-width: 320px;
		}

		.section-header h2 {
			font-size: 1.4rem;
		}
	}
</style>