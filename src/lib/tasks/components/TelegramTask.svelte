<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { supabase } from "$lib/supabaseClient";

	export let config: {
		telegram?: {
			joinChannel?: boolean;
			joinGroup?: boolean;
			channelLink?: string;
			groupLink?: string;
		};
	};
	export let readonly = false;
	export let onComplete: (() => Promise<void>) | undefined = undefined;

	let confirming = false;
	let error = "";
	let isConnected = false;
	let loading = true;
	let connecting = false;
	let connectionUsername = "";
	let pollInterval: ReturnType<typeof setInterval> | null = null;

	onMount(async () => {
		console.log("Telegram task config:", config);
		await checkConnection();
		loading = false;
	});

	onDestroy(() => {
		if (pollInterval) {
			clearInterval(pollInterval);
		}
		// Remove event listeners
		window.removeEventListener("focus", handleWindowFocus);
		document.removeEventListener(
			"visibilitychange",
			handleVisibilityChange,
		);
	});

	// Check connection when window regains focus (user returns from auth popup)
	async function handleWindowFocus() {
		if (connecting) {
			console.log(
				"Telegram: Window focused while connecting, checking connection...",
			);
			const connected = await checkConnection();
			if (connected) {
				connecting = false;
				if (pollInterval) {
					clearInterval(pollInterval);
					pollInterval = null;
				}
			}
		}
	}

	// Check connection when tab becomes visible
	async function handleVisibilityChange() {
		if (!document.hidden && connecting) {
			console.log(
				"Telegram: Tab became visible while connecting, checking connection...",
			);
			const connected = await checkConnection();
			if (connected) {
				connecting = false;
				if (pollInterval) {
					clearInterval(pollInterval);
					pollInterval = null;
				}
			}
		}
	}

	async function checkConnection(): Promise<boolean> {
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				console.log("Telegram checkConnection: No user logged in");
				return false;
			}

			const { data, error: dbError } = await supabase
				.from("social_connections")
				.select("id, username")
				.eq("user_id", user.id)
				.eq("platform", "telegram")
				.maybeSingle(); // Use maybeSingle to avoid error when no record

			if (dbError) {
				console.error("Telegram checkConnection error:", dbError);
				return false;
			}

			const connected = !!data;
			console.log(
				"Telegram checkConnection result:",
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
			console.error("Telegram checkConnection exception:", err);
			return false;
		}
	}

	function connectTelegram() {
		const currentUrl = window.location.href;
		// Use page route to render Telegram Login Widget
		const authUrl = `/auth/telegram/connect?returnTo=${encodeURIComponent(currentUrl)}`;

		connecting = true;
		error = "";

		// Add event listeners to detect when user returns from auth popup
		window.addEventListener("focus", handleWindowFocus);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		// Open in new tab/popup so it can auto-close on success
		window.open(authUrl, "_blank", "width=600,height=700,scrollbars=yes");

		// Start polling to check if connection was successful
		pollInterval = setInterval(async () => {
			const connected = await checkConnection();
			console.log("Telegram polling check - connected:", connected);
			if (connected) {
				connecting = false;
				if (pollInterval) {
					clearInterval(pollInterval);
					pollInterval = null;
				}
				// Remove event listeners
				window.removeEventListener("focus", handleWindowFocus);
				document.removeEventListener(
					"visibilitychange",
					handleVisibilityChange,
				);
			}
		}, 2000);

		// Safety timeout after 5 minutes
		setTimeout(
			() => {
				if (pollInterval) {
					clearInterval(pollInterval);
					pollInterval = null;
					if (!isConnected) {
						connecting = false;
						error = "Connection timed out. Please try again.";
					}
					// Remove event listeners on timeout
					window.removeEventListener("focus", handleWindowFocus);
					document.removeEventListener(
						"visibilitychange",
						handleVisibilityChange,
					);
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
		if (config.telegram?.channelLink) return config.telegram.channelLink;
		if (config.telegram?.groupLink) return config.telegram.groupLink;
		return "";
	}

	function getTaskType(): string {
		if (config.telegram?.joinChannel) return "channel";
		if (config.telegram?.joinGroup) return "group";
		return "channel/group";
	}
</script>

<div class="telegram-task">
	<div class="task-header">
		<div>
			<h4>Telegram</h4>
			<p class="task-instructions">Join the Telegram {getTaskType()}</p>
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
				Join Telegram {getTaskType() === "channel"
					? "Channel"
					: getTaskType() === "group"
						? "Group"
						: ""}
			</a>
		{/if}

		{#if !readonly}
			{#if loading}
				<button class="confirm-btn" disabled>Loading...</button>
			{:else if connecting}
				<div class="connecting-status">
					<span class="spinner"></span>
					<span>Connecting Telegram...</span>
				</div>
			{:else if !isConnected}
				<button class="connect-btn" on:click={connectTelegram}>
					Connect Telegram
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
	.telegram-task {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
		background: rgba(0, 136, 204, 0.05);
		border: 1px solid rgba(0, 136, 204, 0.2);
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
		color: #0088cc;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.9rem;
		padding: 0.75rem 1rem;
		background: rgba(0, 136, 204, 0.1);
		border: 1px solid rgba(0, 136, 204, 0.3);
		border-radius: 8px;
		transition: all 0.2s ease;
		width: fit-content;
	}

	.invite-link:hover {
		background: rgba(0, 136, 204, 0.2);
		transform: translateY(-2px);
	}

	.confirm-btn {
		background: linear-gradient(135deg, #0088cc 0%, #006699 100%);
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
		box-shadow: 0 4px 12px rgba(0, 136, 204, 0.4);
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
		color: #0088cc;
		font-weight: 500;
		padding: 0.75rem 1rem;
		background: rgba(0, 136, 204, 0.1);
		border-radius: 8px;
		width: fit-content;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(0, 136, 204, 0.3);
		border-top-color: #0088cc;
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
		color: #0088cc;
	}
</style>
