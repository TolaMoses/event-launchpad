<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';

	export let config: {
		action: 'join' | 'verify';
		serverId?: string;
		serverName?: string;
		inviteUrl?: string;
		description?: string;
	};
	export let readonly = false;
	export let onComplete: (() => Promise<void>) | undefined = undefined;

	let verifying = false;
	let error = '';
	let isConnected = false;
	let loading = true;

	onMount(async () => {
		await checkConnection();
		loading = false;
	});

	async function checkConnection() {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) return;

		const { data } = await supabase
			.from('social_connections')
			.select('id')
			.eq('user_id', user.id)
			.eq('platform', 'discord')
			.single();

		isConnected = !!data;
	}

	function connectDiscord() {
		const currentUrl = window.location.href;
		window.location.href = `/api/auth/discord/connect?returnTo=${encodeURIComponent(currentUrl)}`;
	}

	async function handleConfirm() {
		if (readonly || !onComplete) return;

		verifying = true;
		error = '';

		try {
			await onComplete();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Verification failed';
		} finally {
			verifying = false;
		}
	}

	function getActionText(): string {
		if (config.action === 'join' && config.serverName) {
			return `Join ${config.serverName} Discord server`;
		}
		return 'Join Discord server';
	}

	function getDiscordUrl(): string {
		return config.inviteUrl || 'https://discord.com';
	}
</script>

<div class="discord-task">
	<div class="task-icon">💬</div>
	<div class="task-content">
		<h4>{getActionText()}</h4>
		{#if config.description}
			<p class="task-description">{config.description}</p>
		{/if}
		<a href={getDiscordUrl()} target="_blank" rel="noopener noreferrer" class="social-link">
			Open Discord →
		</a>
	</div>
	{#if !readonly}
		<div class="task-action">
			{#if loading}
				<button class="confirm-btn" disabled>Loading...</button>
			{:else if !isConnected}
				<button class="connect-btn" on:click={connectDiscord}>
					Connect Discord
				</button>
			{:else}
				<button class="confirm-btn" on:click={handleConfirm} disabled={verifying}>
					{verifying ? 'Verifying...' : 'Confirm'}
				</button>
			{/if}
		</div>
	{/if}
	{#if error}
		<p class="error-message">{error}</p>
	{/if}
</div>

<style>
	.discord-task {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem;
		background: rgba(88, 101, 242, 0.05);
		border: 1px solid rgba(88, 101, 242, 0.2);
		border-radius: 8px;
	}

	.task-icon {
		font-size: 2rem;
		flex-shrink: 0;
	}

	.task-content {
		flex: 1;
	}

	.task-content h4 {
		font-size: 1rem;
		font-weight: 600;
		color: #f2f3ff;
		margin: 0 0 0.5rem;
	}

	.task-description {
		font-size: 0.9rem;
		color: rgba(242, 243, 255, 0.7);
		margin: 0 0 0.75rem;
	}

	.social-link {
		display: inline-block;
		color: #5865f2;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.9rem;
		transition: color 0.2s ease;
	}

	.social-link:hover {
		color: #4752c4;
	}

	.task-action {
		flex-shrink: 0;
	}

	.confirm-btn {
		background: linear-gradient(135deg, #5865f2 0%, #4752c4 100%);
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.65rem 1.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.confirm-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(88, 101, 242, 0.4);
	}

	.confirm-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.connect-btn {
		background: linear-gradient(135deg, #6fa0ff 0%, #5a8dff 100%);
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.65rem 1.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.connect-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(111, 160, 255, 0.4);
	}

	.error-message {
		color: #ff6b6b;
		font-size: 0.85rem;
		margin: 0.5rem 0 0;
		width: 100%;
	}
</style>
