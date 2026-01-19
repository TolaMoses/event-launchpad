<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ASSETS } from '$lib/config/assets';
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
	let taskSubmissions: Record<string, any> = {}; // Store user's submissions
	let editingTask: string | null = null; // Track which task is being edited
	let showVideo = false;
	let showLoginPrompt = false;
	let referrerId: string | null = null;

	$: eventId = $page.params.id;

	onMount(async () => {
		// Check for referral parameter
		const urlParams = new URLSearchParams(window.location.search);
		const refParam = urlParams.get('ref');
		if (refParam) {
			referrerId = refParam;
			// Store in sessionStorage for later use when user completes a task
			sessionStorage.setItem(`event_${eventId}_referrer`, refParam);
		} else {
			// Check if we have a stored referrer for this event
			const storedReferrer = sessionStorage.getItem(`event_${eventId}_referrer`);
			if (storedReferrer) {
				referrerId = storedReferrer;
			}
		}

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
				.maybeSingle();

			hasJoined = !!participantData;

			// Load task completion states and submission data
			// Since tasks are stored as JSON, we check submissions by event_id and extract task_id from submission JSON
			const { data: submissions } = await supabase
				.from('task_submissions')
				.select('submission, verified')
				.eq('user_id', userId)
				.eq('event_id', eventId);

			if (submissions && submissions.length > 0) {
				console.log('Loaded submissions:', submissions);
				submissions.forEach((sub: any) => {
					const taskId = sub.submission?.task_id || sub.submission?.taskId;
					if (taskId) {
						taskStates[taskId] = {
							completed: true, // Mark as completed if submission exists
							submitting: false
						};
						// Store the full submission data for display
						taskSubmissions[taskId] = sub.submission;
						console.log('Task submission loaded:', taskId, sub.submission);
					}
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
		const submissionData: any = {
			task_id: taskId,
			user_id: userId,
			event_id: event.id,
			submission: { completed: true, verified_at: new Date().toISOString() },
			verified: true
		};

		// Include referrer if this user came from a referral link
		if (referrerId && referrerId !== userId) {
			submissionData.referrer_id = referrerId;
		}

		const { error } = await supabase
			.from('task_submissions')
			.insert(submissionData);

		if (error) {
			throw new Error('Failed to save submission');
		}

		// Clear referrer from session after first successful submission
		sessionStorage.removeItem(`event_${eventId}_referrer`);

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
			puzzle: 'Quiz & Games',
			scoreline_prediction: 'Predictions',
			content_submission: 'Content',
			code_entry: 'Challenges',
			referral: 'Referral'
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

	function promptLogin() {
		showLoginPrompt = true;
	}

	function closeLoginPrompt() {
		showLoginPrompt = false;
	}

	function handleLogin() {
		// Scroll to top where the login button is in the header
		window.scrollTo({ top: 0, behavior: 'smooth' });
		showLoginPrompt = false;
	}

	async function submitPrediction(taskId: string) {
		if (!userId || !event) {
			promptLogin();
			return;
		}

		const homeScoreInput = document.getElementById(`home-score-${taskId}`) as HTMLInputElement;
		const awayScoreInput = document.getElementById(`away-score-${taskId}`) as HTMLInputElement;

		if (!homeScoreInput || !awayScoreInput) {
			alert('Please enter both scores');
			return;
		}

		const homeScore = parseInt(homeScoreInput.value);
		const awayScore = parseInt(awayScoreInput.value);

		if (isNaN(homeScore) || isNaN(awayScore)) {
			alert('Please enter valid scores');
			return;
		}

		if (homeScore < 0 || awayScore < 0) {
			alert('Scores cannot be negative');
			return;
		}

		// Mark as submitting
		taskStates[taskId] = { completed: false, submitting: true };

		try {
			console.log('Submitting prediction:', { taskId, eventId: event.id, homeScore, awayScore });
			
			const requestBody: any = {
				taskId,
				eventId: event.id,
				prediction: {
					home_score: homeScore,
					away_score: awayScore
				}
			};

			// Include referrer if this user came from a referral link
			if (referrerId && referrerId !== userId) {
				requestBody.referrerId = referrerId;
			}
			
			const response = await fetch('/api/predictions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(requestBody)
			});

			console.log('Response status:', response.status);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
				console.error('Error response:', errorData);
				throw new Error(errorData.message || errorData.error || `Failed to submit prediction (${response.status})`);
			}

			// Add user to event participants if this is their first task completion
			if (!hasJoined) {
				await joinEvent();
			}

			// Update local state
			taskStates[taskId] = { completed: true, submitting: false };
			taskSubmissions[taskId] = { task_id: taskId, home_score: homeScore, away_score: awayScore };
			editingTask = null; // Clear edit mode
			alert(editingTask ? 'Prediction updated successfully!' : 'Prediction submitted successfully!');
			
			// Reload the page to refresh submission data
			window.location.reload();
		} catch (error) {
			console.error('Failed to submit prediction:', error);
			alert(error instanceof Error ? error.message : 'Failed to submit prediction');
			taskStates[taskId] = { completed: false, submitting: false};
		}
	}

	$: groupedTasks = event ? groupTasksByCategory(event.tasks) : {};
</script>

<div class="event-page">
	{#if loading}
		<div class="loading">Loading event...</div>
	{:else if event}
		<!-- Banner -->
		<div class="event-banner">
			<img src={event.banner_url || ASSETS.events.defaultBanner} alt={event.title} />
			<button class="back-btn" on:click={() => goto('/')}>
				<img src={ASSETS.icons.back} class="utility-icon" alt="Back" />
				Back to Events
			</button>
		</div>

		<div class="event-container">
			<!-- Event Header -->
			<div class="event-header">
				<div class="event-title-section">
					<h3>{event.title}</h3>
					<div class="flex space-between">
						<img src={event.logo_url || ASSETS.events.defaultLogo} alt={event.title} class="event-logo" />
						<div class="event-meta">
							<span>Ends: {formatDate(event.end_time)}</span>
							<span>Winners: {event.num_winners || 'All participants'}</span>
							<span>Prize: {event.prize_details.type}</span>
						</div>
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
												<div class="completed-badge">Completed</div>
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
														id="content-input-{task.id}"
													/>
													<button class="submit-btn" on:click={() => submitContent(task.id)}>
														{isSubmitting ? 'Verifying...' : 'Submit'}
													</button>
												{:else if isCompleted}
												<p class="completed-text">Submission successful</p>
											{:else}
												<button class="login-required-btn" on:click={promptLogin}>
													Log in to participate
												</button>
											{/if}
											</div>
										{:else if ['twitter', 'discord', 'telegram'].includes(task.type)}
											<!-- Social Task -->
											<div class="social-task">
												<p class="task-description">{task.config.description || `Complete this ${task.type} task`}</p>
												{#if !isCompleted && userId}
													<button class="confirm-btn" on:click={() => verifyAndSubmitTask(task.id, task.type, task.config)}>
														{isSubmitting ? 'Verifying...' : 'Confirm Completion'}
													</button>
												{:else if isCompleted}
													<p class="completed-text">Task completed</p>
												{:else}
													<button class="login-required-btn" on:click={promptLogin}>
														Log in to complete this task
													</button>
												{/if}
											</div>
										{:else if task.type === 'scoreline'}
											<!-- Scoreline Prediction Task -->
											<div class="scoreline-task">
												<div class="match-info">
													{#if task.config.league?.name}
														<div class="league-name">{task.config.league.name}</div>
													{/if}
													<div class="match-teams">
														<div class="team">{task.config.home_team?.name || 'Home'}</div>
														<div class="vs">VS</div>
														<div class="team">{task.config.away_team?.name || 'Away'}</div>
													</div>
													{#if task.config.match_date}
														<div class="match-datetime">
															{new Date(task.config.match_date).toLocaleDateString()}
															{#if task.config.match_time}
																at {task.config.match_time}
															{/if}
														</div>
													{/if}
													{#if task.config.description}
														<p class="match-description">{task.config.description}</p>
													{/if}
												</div>

												{#if (!isCompleted || editingTask === task.id) && userId}
													<div class="prediction-form">
														<div class="score-inputs">
															<div class="score-input-group">
																<label>{task.config.home_team?.name || 'Home'}</label>
																<input 
																	type="number" 
																	min="0" 
																	max="99"
																	placeholder="0"
																	value={editingTask === task.id ? taskSubmissions[task.id]?.home_score : ''}
																	class="score-input"
																	id="home-score-{task.id}"
																/>
															</div>
															<div class="score-separator">-</div>
															<div class="score-input-group">
																<label>{task.config.away_team?.name || 'Away'}</label>
																<input 
																	type="number" 
																	min="0" 
																	max="99"
																	placeholder="0"
																	value={editingTask === task.id ? taskSubmissions[task.id]?.away_score : ''}
																	class="score-input"
																	id="away-score-{task.id}"
																/>
															</div>
														</div>
														<div class="prediction-actions">
															<button 
																class="submit-prediction-btn"
																on:click={() => submitPrediction(task.id)}
																disabled={taskStates[task.id]?.submitting}
															>
																{taskStates[task.id]?.submitting ? 'Submitting...' : (editingTask === task.id ? 'Update Prediction' : 'Submit Prediction')}
															</button>
															{#if editingTask === task.id}
																<button 
																	class="cancel-edit-btn"
																	on:click={() => editingTask = null}
																>
																	Cancel
																</button>
															{/if}
														</div>
													</div>
												{:else if isCompleted}
													<div class="submitted-prediction">
														<p class="completed-text">Your Prediction</p>
														<div class="prediction-display">
															<div class="team-score">
																<span class="team-name">{task.config.home_team?.name || 'Home'}</span>
																<span class="score-value">{taskSubmissions[task.id]?.home_score ?? '-'}</span>
															</div>
															<div class="score-separator">-</div>
															<div class="team-score">
																<span class="team-name">{task.config.away_team?.name || 'Away'}</span>
																<span class="score-value">{taskSubmissions[task.id]?.away_score ?? '-'}</span>
															</div>
														</div>
														{#if event && new Date(event.end_time) > new Date()}
															<button 
																class="edit-prediction-btn"
																on:click={() => editingTask = task.id}
															>
																Edit Prediction
															</button>
														{/if}
													</div>
												{:else}
													<button class="login-required-btn" on:click={promptLogin}>
														Log in to participate
													</button>
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
											<div class="generic-task-info">
												<p class="task-type-label">Task: {taskEntry?.label || task.type}</p>
												{#if task.config.description}
													<p class="task-description">{task.config.description}</p>
												{/if}
											</div>
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

<!-- Login Prompt Modal -->
{#if showLoginPrompt}
	<div class="modal-overlay" on:click={closeLoginPrompt}>
		<div class="modal-content" on:click|stopPropagation>
			<div class="modal-header">
				<h3>🔒 Login Required</h3>
				<button class="modal-close-btn" on:click={closeLoginPrompt}>✕</button>
			</div>
			<div class="modal-body">
				<p>You need to be logged in to complete tasks and submit predictions.</p>
				<p>Please log in using the button in the top navigation bar.</p>
			</div>
			<div class="modal-footer">
				<button class="modal-btn-secondary" on:click={closeLoginPrompt}>Cancel</button>
				<button class="modal-btn-primary" on:click={handleLogin}>Go to Login</button>
			</div>
		</div>
	</div>
{/if}

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

	.generic-task-info {
		padding: 1rem;
		background: rgba(91, 141, 255, 0.05);
		border: 1px solid rgba(91, 141, 255, 0.15);
		border-radius: 10px;
	}

	.task-type-label {
		font-size: 1rem;
		font-weight: 600;
		color: rgba(242, 243, 255, 0.9);
		margin: 0 0 0.5rem 0;
	}

	.task-description {
		font-size: 0.875rem;
		color: rgba(242, 243, 255, 0.7);
		margin: 0;
		line-height: 1.5;
	}

	/* Scoreline Prediction Task Styles */
	.scoreline-task {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.match-info {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(91, 141, 255, 0.08);
		border: 1px solid rgba(91, 141, 255, 0.2);
		border-radius: 10px;
	}

	.league-name {
		font-size: 0.85rem;
		color: rgba(242, 243, 255, 0.7);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		text-align: center;
	}

	.match-teams {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		font-size: 1.2rem;
		font-weight: 700;
		color: #f2f3ff;
	}

	.match-teams .team {
		flex: 1;
		text-align: center;
	}

	.match-teams .vs {
		color: rgba(242, 243, 255, 0.5);
		font-size: 0.9rem;
		font-weight: 600;
	}

	.match-datetime {
		font-size: 0.9rem;
		color: rgba(242, 243, 255, 0.8);
		text-align: center;
	}

	.match-description {
		font-size: 0.9rem;
		color: rgba(242, 243, 255, 0.7);
		margin: 0;
		text-align: center;
	}

	.prediction-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.score-inputs {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
	}

	.score-input-group {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		max-width: 150px;
	}

	.score-input-group label {
		font-size: 0.9rem;
		color: rgba(242, 243, 255, 0.9);
		font-weight: 600;
		text-align: center;
	}

	.score-input {
		width: 100%;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.06);
		border: 2px solid rgba(255, 255, 255, 0.15);
		border-radius: 10px;
		color: #f2f3ff;
		font-size: 1.5rem;
		font-weight: 700;
		text-align: center;
		transition: border-color 0.2s ease;
	}

	.score-input:focus {
		outline: none;
		border-color: #6fa0ff;
		background: rgba(255, 255, 255, 0.08);
	}

	.score-input::placeholder {
		color: rgba(242, 243, 255, 0.3);
	}

	.score-separator {
		font-size: 1.5rem;
		font-weight: 700;
		color: rgba(242, 243, 255, 0.5);
		margin-top: 1.5rem;
	}

	.submit-prediction-btn {
		background: linear-gradient(135deg, #6fa0ff 0%, #5a8dff 100%);
		color: white;
		border: none;
		border-radius: 10px;
		padding: 1rem 2rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.submit-prediction-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(111, 160, 255, 0.4);
	}

	.submit-prediction-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.login-required-btn {
		background: linear-gradient(135deg, rgba(111, 160, 255, 0.3) 0%, rgba(90, 141, 255, 0.3) 100%);
		color: rgba(242, 243, 255, 0.9);
		border: 2px dashed rgba(111, 160, 255, 0.5);
		border-radius: 10px;
		padding: 1rem 2rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		width: 100%;
	}

	.login-required-btn:hover {
		background: linear-gradient(135deg, rgba(111, 160, 255, 0.4) 0%, rgba(90, 141, 255, 0.4) 100%);
		border-color: rgba(111, 160, 255, 0.7);
		transform: translateY(-2px);
	}

	.submitted-prediction {
		background: rgba(16, 185, 129, 0.1);
		border: 2px solid rgba(16, 185, 129, 0.3);
		border-radius: 12px;
		padding: 1.5rem;
		margin-top: 1rem;
	}

	.prediction-display {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		margin-top: 1rem;
	}

	.team-score {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.team-name {
		color: rgba(242, 243, 255, 0.7);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.score-value {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		color: white;
		font-size: 2rem;
		font-weight: 700;
		width: 60px;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
	}

	.prediction-actions {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.edit-prediction-btn {
		background: linear-gradient(135deg, rgba(111, 160, 255, 0.2) 0%, rgba(90, 141, 255, 0.2) 100%);
		color: #6fa0ff;
		border: 2px solid rgba(111, 160, 255, 0.4);
		border-radius: 8px;
		padding: 0.6rem 1.2rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-top: 1rem;
		width: 100%;
	}

	.edit-prediction-btn:hover {
		background: linear-gradient(135deg, rgba(111, 160, 255, 0.3) 0%, rgba(90, 141, 255, 0.3) 100%);
		border-color: rgba(111, 160, 255, 0.6);
		transform: translateY(-2px);
	}

	.cancel-edit-btn {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		border: 2px solid rgba(239, 68, 68, 0.3);
		border-radius: 10px;
		padding: 1rem 2rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.cancel-edit-btn:hover {
		background: rgba(239, 68, 68, 0.2);
		border-color: rgba(239, 68, 68, 0.5);
		transform: translateY(-2px);
	}

	/* Login Modal Styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal-content {
		background: linear-gradient(135deg, #1a1c2d 0%, #252840 100%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		max-width: 500px;
		width: 100%;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-header h3 {
		margin: 0;
		color: #f2f3ff;
		font-size: 1.25rem;
	}

	.modal-close-btn {
		background: none;
		border: none;
		color: rgba(242, 243, 255, 0.6);
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s;
	}

	.modal-close-btn:hover {
		color: #f2f3ff;
	}

	.modal-body {
		padding: 1.5rem;
	}

	.modal-body p {
		color: rgba(242, 243, 255, 0.8);
		margin: 0 0 1rem 0;
		line-height: 1.6;
	}

	.modal-body p:last-child {
		margin-bottom: 0;
	}

	.modal-footer {
		display: flex;
		gap: 1rem;
		padding: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-btn-secondary,
	.modal-btn-primary {
		flex: 1;
		padding: 0.875rem 1.5rem;
		border-radius: 10px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
	}

	.modal-btn-secondary {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(242, 243, 255, 0.8);
		border: 1px solid rgba(255, 255, 255, 0.15);
	}

	.modal-btn-secondary:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	.modal-btn-primary {
		background: linear-gradient(135deg, #6fa0ff 0%, #5a8dff 100%);
		color: white;
	}

	.modal-btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(111, 160, 255, 0.4);
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
