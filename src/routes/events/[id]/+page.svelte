<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';
	import { taskRegistry } from '$lib/tasks/taskRegistry';

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
		tasks: Array<{
			id: string;
			type: string;
			config: any;
		}>;
		status: string;
		created_by: string;
	};

	let event: Event | null = null;
	let loading = true;
	let userId: string | null = null;
	let hasJoined = false;
	let taskStates: Record<string, { completed: boolean; submitting: boolean }> = {};
	let showVideo = false;

	$: eventId = $page.params.id;

	onMount(async () => {
		const { data: { user } } = await supabase.auth.getUser();
		
		if (user) {
			userId = user.id;
		}

		// Fetch event details
		const { data: eventData, error: eventError } = await supabase
			.from('events')
			.select('*')
			.eq('id', eventId)
			.single();

		if (eventError || !eventData) {
			goto('/');
			return;
		}

		event = eventData;

		// Load task completion states for logged-in users
		if (userId) {
			// Check if user has already joined (by completing tasks)
			const { data: participantData } = await supabase
				.from('event_participants')
				.select('id')
				.eq('event_id', eventId)
				.eq('user_id', userId)
				.single();

			hasJoined = !!participantData;

			// Load task completion states
			const { data: submissions } = await supabase
				.from('task_submissions')
				.select('task_id, verified')
				.eq('user_id', userId)
				.in('task_id', event.tasks.map(t => t.id));

			if (submissions) {
				submissions.forEach(sub => {
					taskStates[sub.task_id] = {
						completed: sub.verified,
						submitting: false
					};
				});
			}
		}

		loading = false;
	});

	async function joinEvent() {
		if (!userId || !event) return;

		const { error } = await supabase
			.from('event_participants')
			.insert({
				event_id: event.id,
				user_id: userId
			});

		if (!error) {
			hasJoined = true;
		}
	}

	async function verifyAndSubmitTask(taskId: string, taskType: string, config: any) {
		if (!userId || !event) return;

		// Call appropriate verification API based on task type
		let verificationEndpoint = '';
		let verificationPayload: any = {};

		switch (taskType) {
			case 'twitter':
				verificationEndpoint = '/api/tasks/verify-twitter';
				verificationPayload = {
					action: config.action,
					username: config.username,
					tweetUrl: config.tweetUrl
				};
				break;
			case 'discord':
				verificationEndpoint = '/api/tasks/verify-discord';
				verificationPayload = {
					serverId: config.serverId,
					action: config.action
				};
				break;
			case 'telegram':
				verificationEndpoint = '/api/tasks/verify-telegram';
				verificationPayload = {
					channelName: config.channelName,
					action: config.action
				};
				break;
			default:
				throw new Error('Unsupported task type');
		}

		// Verify with external API
		const verifyResponse = await fetch(verificationEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(verificationPayload)
		});

		if (!verifyResponse.ok) {
			const errorData = await verifyResponse.json();
			throw new Error(errorData.message || 'Verification failed');
		}

		// If verified, submit to database
		const { error } = await supabase
			.from('task_submissions')
			.insert({
				task_id: taskId,
				user_id: userId,
				submission: { completed: true, verified_at: new Date().toISOString() },
				verified: true
			});

		if (error) {
			throw new Error('Failed to save submission');
		}

		// Add user to event participants if this is their first task completion
		if (!hasJoined) {
			const { error: participantError } = await supabase
				.from('event_participants')
				.insert({
					event_id: event.id,
					user_id: userId
				});

			if (!participantError) {
				hasJoined = true;
			}
		}

		// Update local state
		taskStates[taskId] = { completed: true, submitting: false };
	}

	function getVideoEmbedUrl(url: string): string | null {
		if (!url) return null;

		// YouTube
		const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
		if (youtubeMatch) {
			return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
		}

		// Vimeo
		const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
		if (vimeoMatch) {
			return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
		}

		return null;
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleString();
	}

	function getTaskComponent(taskType: string) {
		return taskRegistry[taskType as keyof typeof taskRegistry];
	}

	function getTaskCategory(taskType: string): string {
		const categories: Record<string, string> = {
			twitter: 'Social',
			discord: 'Social',
			telegram: 'Social',
			quiz: 'Quiz & Games',
			game: 'Quiz & Games',
			puzzle: 'Quiz & Games',
			content_submission: 'Content',
			treasure_hunt: 'Challenges',
			irl: 'IRL Events'
		};
		return categories[taskType] || 'Other';
	}

	function groupTasksByCategory(tasks: typeof event.tasks) {
		const grouped: Record<string, typeof event.tasks> = {};
		tasks.forEach(task => {
			const category = getTaskCategory(task.type);
			if (!grouped[category]) {
				grouped[category] = [];
			}
			grouped[category].push(task);
		});
		return grouped;
	}

	$: groupedTasks = event ? groupTasksByCategory(event.tasks) : {};
</script>

<div class="event-page">
	{#if loading}
		<div class="loading">Loading event...</div>
	{:else if event}
		<!-- Banner -->
		<div class="event-banner">
			<img src={event.banner_url || '/images/default-banner.jpg'} alt={event.title} />
			<button class="back-btn" on:click={() => goto('/')}>
				<img src="/icons/back-button.svg" alt="Back" />
				Back to Events
			</button>
		</div>

		<div class="event-container">
			<!-- Event Header -->
			<div class="event-header">
				<img src={event.logo_url || '/icons/event-logo.svg'} alt={event.title} class="event-logo" />
				<div class="event-title-section">
					<h3>{event.title}</h3>
					<div class="event-meta">
						<span>Ends: {formatDate(event.end_time)}</span>
						<span>Winners: {event.num_winners || 'All participants'}</span>
						<span>Prize: {event.prize_details.type}</span>
					</div>
				</div>
				
			</div>

			<!-- Description -->
			<div class="section">
				<h2>Description</h2>
				<p class="description">{event.description}</p>
			</div>

			<!-- Video -->
			{#if event.video_url}
				<div class="section">
					<h2>Event Video</h2>
					{#if showVideo}
						{@const embedUrl = getVideoEmbedUrl(event.video_url)}
						{#if embedUrl}
							<div class="video-container">
								<iframe
									src={embedUrl}
									title="Event video"
									frameborder="0"
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
									allowfullscreen
								></iframe>
							</div>
						{:else}
							<a href={event.video_url} target="_blank" rel="noopener noreferrer" class="video-link">
								Watch Video →
							</a>
						{/if}
					{:else}
						<button class="secondary-btn" on:click={() => showVideo = true}>
							▶ Show Video
						</button>
					{/if}
				</div>
			{/if}

			<!-- Tasks -->
			<div class="section">
				<h2>Tasks</h2>
				{#if !userId}
					<p class="section-hint">Please log in to complete tasks and earn rewards</p>
				{:else}
					<p class="section-hint">Complete all tasks to be eligible for rewards</p>
				{/if}
				
				{#each Object.entries(groupedTasks) as [category, tasks]}
					<div class="task-category">
						<h3 class="category-title">{category}</h3>
						<div class="tasks-list">
							{#each tasks as task, index}
								{@const taskEntry = getTaskComponent(task.type)}
								{@const isCompleted = taskStates[task.id]?.completed}
								{@const isSubmitting = taskStates[task.id]?.submitting}
								
								<div class="task-card" class:completed={isCompleted}>
									<div class="task-header">
										<div class="task-info">
											<div class="task-type-badge">{taskEntry?.label || task.type}</div>
											{#if isCompleted}
												<div class="completed-badge">✓ Completed</div>
											{/if}
										</div>
									</div>

									<div class="task-body">
										{#if task.type === 'content_submission'}
											<!-- Content Submission Task -->
											<div class="content-submission-task">
												<p class="task-description">{task.config.description || 'Submit your content'}</p>
												{#if !isCompleted && userId}
													<input 
														type="url" 
														placeholder="Enter content URL (e.g., YouTube, Twitter, etc.)"
														class="content-input"
													/>
													<button class="submit-btn">Submit</button>
												{:else if isCompleted}
													<p class="completed-text">✓ Content submitted successfully</p>
												{:else}
													<p class="login-prompt">Log in to submit content</p>
												{/if}
											</div>
										{:else if ['twitter', 'discord', 'telegram'].includes(task.type)}
											<!-- Social Task -->
											<div class="social-task">
												<p class="task-description">{task.config.description || `Complete this ${task.type} task`}</p>
												{#if task.config.invite_link || task.config.link || task.config.url}
													<a 
														href={task.config.invite_link || task.config.link || task.config.url} 
														target="_blank" 
														rel="noopener noreferrer"
														class="social-link"
													>
														{#if task.type === 'twitter'}
															🐦 Follow on Twitter
														{:else if task.type === 'discord'}
															💬 Join Discord Server
														{:else if task.type === 'telegram'}
															✈️ Join Telegram Channel
														{/if}
													</a>
												{/if}
												{#if !isCompleted && userId}
													<button class="confirm-btn" on:click={() => verifyAndSubmitTask(task.id, task.type, task.config)}>
														{isSubmitting ? 'Verifying...' : 'Confirm Completion'}
													</button>
												{:else if isCompleted}
													<p class="completed-text">✓ Task completed</p>
												{:else}
													<p class="login-prompt">Log in to complete this task</p>
												{/if}
											</div>
										{:else if taskEntry?.component}
											<svelte:component 
												this={taskEntry.component} 
												config={task.config}
												readonly={isCompleted || !userId}
												onComplete={userId ? async () => await verifyAndSubmitTask(task.id, task.type, task.config) : undefined}
											/>
										{:else}
											<p>Task type: {task.type}</p>
											<pre>{JSON.stringify(task.config, null, 2)}</pre>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.event-page {
		min-height: 100vh;
		background: var(--background-color);
	}

	.event-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 2rem 4rem;
	}

	.back-btn {
		position: absolute;
		top: 2rem;
		left: 2rem;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(10px);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		padding: 0.75rem 1.5rem;
		font-size: 0.95rem;
		cursor: pointer;
		z-index: 10;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.back-btn:hover {
		background: rgba(0, 0, 0, 0.9);
		transform: translateX(-4px);
	}

	.back-btn img {
		width: 16px;
		height: 16px;
	}

	.loading {
		text-align: center;
		padding: 4rem 2rem;
		color: rgba(242, 243, 255, 0.6);
	}

	.event-banner {
		position: relative;
		width: 100%;
		height: 400px;
		overflow: hidden;
	}

	.event-banner img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.event-header {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.event-logo {
		width: 80px;
		height: 80px;
		border-radius: 12px;
		object-fit: cover;
		background: rgba(255, 255, 255, 0.08);
		flex-shrink: 0;
	}

	.event-title-section {
		flex: 1;
	}

	.event-title-section h1 {
		font-size: 1.8rem;
		font-weight: 700;
		color: #f2f3ff;
		margin: 0 0 0.75rem;
	}

	.event-meta {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.7rem;
		color: rgba(242, 243, 255, 0.6);
	}

	.join-section {
		padding: 1.5rem 2rem;
		background: rgba(111, 160, 255, 0.1);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		text-align: center;
	}

	.info-text {
		color: rgba(242, 243, 255, 0.8);
		margin: 0;
	}

	.section {
		padding: 2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.section:last-child {
		border-bottom: none;
	}

	.section h2 {
		font-size: 1.4rem;
		font-weight: 700;
		color: #f2f3ff;
		margin: 0 0 1rem;
	}

	.section-hint {
		color: rgba(242, 243, 255, 0.6);
		font-size: 0.9rem;
		margin: 0 0 1.5rem;
	}

	.description {
		color: rgba(242, 243, 255, 0.8);
		line-height: 1.7;
		margin: 0;
		white-space: pre-wrap;
	}

	.video-container {
		position: relative;
		padding-bottom: 56.25%;
		height: 0;
		overflow: hidden;
		border-radius: 12px;
	}

	.video-container iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		border-radius: 12px;
	}

	.video-link {
		display: inline-block;
		color: #6fa0ff;
		text-decoration: none;
		font-weight: 600;
		transition: color 0.2s ease;
	}

	.video-link:hover {
		color: #5a8dff;
	}

	.task-category {
		margin-bottom: 3rem;
	}

	.category-title {
		font-size: 1.3rem;
		font-weight: 700;
		color: #6fa0ff;
		margin: 0 0 1.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid rgba(111, 160, 255, 0.3);
	}

	.tasks-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.task-card {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 1.5rem;
		transition: border-color 0.2s ease;
	}

	.task-card.completed {
		border-color: rgba(40, 167, 69, 0.4);
		background: rgba(40, 167, 69, 0.05);
	}

	.task-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.task-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.task-type-badge {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(242, 243, 255, 0.9);
		padding: 0.35rem 0.85rem;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.85rem;
		text-transform: capitalize;
	}

	.completed-badge {
		background: rgba(40, 167, 69, 0.2);
		color: #28a745;
		padding: 0.35rem 0.85rem;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.85rem;
		margin-left: auto;
	}

	.task-body {
		margin-bottom: 1rem;
		color: rgba(242, 243, 255, 0.8);
	}

	.task-actions {
		display: flex;
		gap: 0.75rem;
	}

	.locked-tasks {
		text-align: center;
		padding: 3rem 2rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px dashed rgba(255, 255, 255, 0.1);
		border-radius: 12px;
	}

	.locked-tasks p {
		font-size: 1.1rem;
		color: rgba(242, 243, 255, 0.6);
		margin: 0;
	}

	.primary-btn {
		background: linear-gradient(135deg, #6fa0ff 0%, #5a8dff 100%);
		color: white;
		border: none;
		border-radius: 12px;
		padding: 0.85rem 1.75rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.primary-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(111, 160, 255, 0.4);
	}

	.primary-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.primary-btn.large {
		padding: 1rem 2.5rem;
		font-size: 1.1rem;
	}

	.secondary-btn {
		background: rgba(255, 255, 255, 0.08);
		color: #f2f3ff;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		padding: 0.85rem 1.75rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.secondary-btn:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	/* Content Submission Task Styles */
	.content-submission-task,
	.social-task {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.task-description {
		color: rgba(242, 243, 255, 0.9);
		margin: 0;
		line-height: 1.6;
	}

	.content-input {
		width: 100%;
		padding: 0.85rem 1rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		color: #f2f3ff;
		font-size: 0.95rem;
		transition: border-color 0.2s ease;
	}

	.content-input:focus {
		outline: none;
		border-color: #6fa0ff;
		background: rgba(255, 255, 255, 0.08);
	}

	.content-input::placeholder {
		color: rgba(242, 243, 255, 0.4);
	}

	.submit-btn,
	.confirm-btn {
		background: linear-gradient(135deg, #6fa0ff 0%, #5a8dff 100%);
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.85rem 1.5rem;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		align-self: flex-start;
	}

	.submit-btn:hover,
	.confirm-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(111, 160, 255, 0.4);
	}

	.social-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(111, 160, 255, 0.15);
		color: #6fa0ff;
		text-decoration: none;
		padding: 0.85rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		transition: all 0.2s ease;
		border: 1px solid rgba(111, 160, 255, 0.3);
	}

	.social-link:hover {
		background: rgba(111, 160, 255, 0.25);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(111, 160, 255, 0.3);
	}

	.completed-text {
		color: #28a745;
		font-weight: 600;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.login-prompt {
		color: rgba(242, 243, 255, 0.5);
		font-style: italic;
		margin: 0;
	}

	@media (max-width: 768px) {
		.event-container {
			padding: 0 1rem 2rem;
		}

		.event-banner {
			height: 250px;
		}

		.back-btn {
			top: 1rem;
			left: 1rem;
			padding: 0.6rem 1rem;
			font-size: 0.85rem;
		}

		.event-header {
			flex-direction: column;
			align-items: flex-start;
			padding: 1.5rem;
		}

		.category-title {
			font-size: 1.1rem;
		}
	}
</style>
