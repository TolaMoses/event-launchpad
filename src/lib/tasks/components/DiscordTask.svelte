<script lang="ts">
	import { onMount } from "svelte";
	import { supabase } from "$lib/supabaseClient";

	export let config: {
		discord?: {
			joinServer?: boolean;
			inviteLink?: string;
			serverId?: string;
			serverName?: string;
		};
		description?: string;
		title?: string;
	};
	export let readonly = false;
	export let onComplete: (() => Promise<void>) | undefined = undefined;

	let confirming = false;
	let error = "";
	let isConnected = false;
	let loading = true;

	onMount(async () => {
		console.log("Discord task config:", config);
		await checkConnection();
		loading = false;
	});

	async function checkConnection() {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return;

		const { data } = await supabase
			.from("social_connections")
			.select("id")
			.eq("user_id", user.id)
			.eq("platform", "discord")
			.single();

		isConnected = !!data;
	}

	function connectDiscord() {
		const currentUrl = window.location.href;
		const authUrl = `/api/auth/discord/connect?returnTo=${encodeURIComponent(currentUrl)}`;
		// Open in new tab/popup so it can auto-close on success
		window.open(authUrl, "_blank", "width=600,height=700,scrollbars=yes");
	}

	async function handleConfirm() {
		if (readonly || !onComplete) return;

		confirming = true;
		error = "";

		try {
			await onComplete();
		} catch (err) {
			error = err instanceof Error ? err.message : "Confirmation failed";
		} finally {
			confirming = false;
		}
	}

	function getInviteUrl(): string {
		return config?.discord?.inviteLink || "";
	}

	function getServerName(): string {
		return config?.discord?.serverName || "Discord Server";
	}

	function getDescription(): string {
		return config?.description || "Join the Discord server";
	}
</script>

<div class="discord-task">
	<div class="task-header">
		<div class="task-icon">💬</div>
		<div>
			<h4>
				Discord{#if getServerName() !== "Discord Server"}
					- {getServerName()}{/if}
			</h4>
			<p class="task-instructions">{getDescription()}</p>
		</div>
	</div>

	<div class="task-body">
		{#if getInviteUrl()}
			<a
				href={getInviteUrl()}
				target="_blank"
				rel="noopener noreferrer"
				class="invite-link"
			>
				🔗 Join Discord Server
			</a>
		{/if}

		{#if !readonly}
			{#if loading}
				<button class="confirm-btn" disabled>Loading...</button>
			{:else if !isConnected}
				<button class="connect-btn" on:click={connectDiscord}>
					Connect Discord
				</button>
			{:else}
				<button
					class="confirm-btn"
					on:click={handleConfirm}
					disabled={confirming}
				>
					{confirming ? "Confirming..." : "Confirm I Joined"}
				</button>
			{/if}
		{:else}
			<p class="completed-text">Task completed</p>
		{/if}

		{#if error}
			<p class="error-message">{error}</p>
		{/if}
	</div>
</div>

<style>
	.discord-task {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
		background: rgba(88, 101, 242, 0.05);
		border: 1px solid rgba(88, 101, 242, 0.2);
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
		gap: 1rem;
	}

	.invite-link {
		display: inline-block;
		color: #5865f2;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.9rem;
		padding: 0.75rem 1rem;
		background: rgba(88, 101, 242, 0.1);
		border: 1px solid rgba(88, 101, 242, 0.3);
		border-radius: 8px;
		transition: all 0.2s ease;
		width: fit-content;
	}

	.invite-link:hover {
		background: rgba(88, 101, 242, 0.2);
		transform: translateY(-2px);
	}

	.confirm-btn {
		background: linear-gradient(135deg, #5865f2 0%, #4752c4 100%);
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.75rem 1.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
		width: fit-content;
	}

	.confirm-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(88, 101, 242, 0.4);
	}

	.confirm-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.connect-btn {
		background: linear-gradient(135deg, #6fa0ff 0%, #5a8dff 100%);
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.75rem 1.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
		width: fit-content;
	}

	.connect-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(111, 160, 255, 0.4);
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
