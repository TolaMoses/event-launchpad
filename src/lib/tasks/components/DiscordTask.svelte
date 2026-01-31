<script lang="ts">
	import { onMount, onDestroy } from "svelte";
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
	let connecting = false; // New state for connection in progress
	let connectionUsername = ""; // Store connected username
	let pollInterval: ReturnType<typeof setInterval> | null = null;

	onMount(async () => {
		console.log("Discord task config:", config);
		await checkConnection();
		loading = false;
	});

	onDestroy(() => {
		// Clean up polling on component destroy
		if (pollInterval) {
			clearInterval(pollInterval);
		}
	});

	async function checkConnection(): Promise<boolean> {
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				console.log("Discord checkConnection: No user logged in");
				return false;
			}

			const { data, error: dbError } = await supabase
				.from("social_connections")
				.select("id, username")
				.eq("user_id", user.id)
				.eq("platform", "discord")
				.maybeSingle(); // Use maybeSingle to avoid error when no record

			if (dbError) {
				console.error("Discord checkConnection error:", dbError);
				return false;
			}

			const connected = !!data;
			console.log(
				"Discord checkConnection result:",
				connected,
				data?.username,
			);

			// Force reactivity by explicit assignment
			isConnected = connected;
			if (data?.username) {
				connectionUsername = data.username;
			}

			return connected;
		} catch (err) {
			console.error("Discord checkConnection exception:", err);
			return false;
		}
	}

	function connectDiscord() {
		const currentUrl = window.location.href;
		const authUrl = `/api/auth/discord/connect?returnTo=${encodeURIComponent(currentUrl)}`;

		// Set connecting state
		connecting = true;
		error = "";

		// Open in new tab/popup so it can auto-close on success
		const popup = window.open(
			authUrl,
			"_blank",
			"width=600,height=700,scrollbars=yes",
		);

		// Start polling to check if connection was successful
		pollInterval = setInterval(async () => {
			const connected = await checkConnection();
			console.log("Polling check - connected:", connected);
			if (connected) {
				// Connection successful - stop polling
				connecting = false;
				if (pollInterval) {
					clearInterval(pollInterval);
					pollInterval = null;
				}
			}
		}, 2000); // Poll every 2 seconds

		// Also stop polling after 5 minutes (safety timeout)
		setTimeout(
			() => {
				if (pollInterval) {
					clearInterval(pollInterval);
					pollInterval = null;
					if (!isConnected) {
						connecting = false;
						error = "Connection timed out. Please try again.";
					}
				}
			},
			5 * 60 * 1000,
		);
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
			{:else if connecting}
				<div class="connecting-status">
					<span class="spinner"></span>
					<span>Connecting Discord...</span>
				</div>
			{:else if !isConnected}
				<button class="connect-btn" on:click={connectDiscord}>
					Connect Discord
				</button>
			{:else}
				{#if connectionUsername}
					<div class="connected-status">
						<span class="connected-icon">✓</span>
						<span
							>Connected as <strong>{connectionUsername}</strong
							></span
						>
					</div>
				{/if}
				<button
					class="confirm-btn"
					on:click={handleConfirm}
					disabled={confirming}
				>
					{confirming ? "Confirming..." : "Confirm I Joined Server"}
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

	.connecting-status {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: #5865f2;
		font-weight: 500;
		padding: 0.75rem 1rem;
		background: rgba(88, 101, 242, 0.1);
		border-radius: 8px;
		width: fit-content;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(88, 101, 242, 0.3);
		border-top-color: #5865f2;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.connected-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #10b981;
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
	}

	.connected-icon {
		font-size: 1rem;
	}

	.connected-status strong {
		color: #5865f2;
	}
</style>
