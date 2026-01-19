<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	export let config: Record<string, unknown> = {};
	export let readonly = false;
	export let userId: string | null = null;
	export let eventId: string = '';

	let referralLink = '';
	let referralCount = 0;
	let copied = false;
	let loading = true;

	onMount(async () => {
		if (userId && eventId) {
			// Generate referral link
			const baseUrl = window.location.origin;
			referralLink = `${baseUrl}/events/${eventId}?ref=${userId}`;
			
			// Fetch referral count
			await fetchReferralCount();
		}
		loading = false;
	});

	async function fetchReferralCount() {
		try {
			const response = await fetch(`/api/referrals/count?eventId=${eventId}&userId=${userId}`);
			if (response.ok) {
				const data = await response.json();
				referralCount = data.count || 0;
			}
		} catch (err) {
			console.error('Failed to fetch referral count:', err);
		}
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(referralLink);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}
</script>

<div class="referral-task">
	<div class="task-header">
		<div class="task-icon">🔗</div>
		<div>
			<h4>Referral Task</h4>
			<p class="task-instructions">Share your referral link and earn rewards</p>
		</div>
	</div>

	<div class="task-body">
		{#if loading}
			<p class="loading-text">Loading...</p>
		{:else if !userId}
			<p class="login-prompt">Please log in to get your referral link</p>
		{:else}
			<div class="referral-stats">
				<div class="stat-card">
					<div class="stat-value">{referralCount}</div>
					<div class="stat-label">Successful Referrals</div>
				</div>
			</div>

			<div class="referral-link-section">
				<label for="referral-link">Your Referral Link</label>
				<div class="link-input-group">
					<input 
						id="referral-link"
						type="text" 
						value={referralLink}
						readonly
					/>
					<button class="copy-btn" on:click={copyToClipboard}>
						{copied ? '✓ Copied!' : 'Copy'}
					</button>
				</div>
			</div>

			<div class="info-box">
				<p>💡 <strong>How it works:</strong></p>
				<ul>
					<li>Share your referral link with friends</li>
					<li>When they complete any task in this event, you get credit</li>
					<li>Only new participants (who haven't completed tasks before) count</li>
				</ul>
			</div>
		{/if}
	</div>
</div>

<style>
	.referral-task {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 1.5rem;
		background: rgba(16, 185, 129, 0.05);
		border: 1px solid rgba(16, 185, 129, 0.2);
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
		gap: 1.5rem;
	}

	.loading-text, .login-prompt {
		color: rgba(242, 243, 255, 0.7);
		text-align: center;
		margin: 0;
	}

	.referral-stats {
		display: flex;
		gap: 1rem;
	}

	.stat-card {
		flex: 1;
		padding: 1.5rem;
		background: rgba(16, 185, 129, 0.1);
		border: 1px solid rgba(16, 185, 129, 0.3);
		border-radius: 12px;
		text-align: center;
	}

	.stat-value {
		font-size: 2.5rem;
		font-weight: 700;
		color: #10b981;
		margin-bottom: 0.5rem;
	}

	.stat-label {
		font-size: 0.875rem;
		color: rgba(242, 243, 255, 0.7);
		font-weight: 500;
	}

	.referral-link-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.referral-link-section label {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(242, 243, 255, 0.9);
	}

	.link-input-group {
		display: flex;
		gap: 0.5rem;
	}

	.link-input-group input {
		flex: 1;
		padding: 0.75rem 1rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(16, 185, 129, 0.3);
		border-radius: 8px;
		color: #f2f3ff;
		font-size: 0.875rem;
		font-family: monospace;
	}

	.link-input-group input:focus {
		outline: none;
		border-color: #10b981;
	}

	.copy-btn {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.75rem 1.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		white-space: nowrap;
	}

	.copy-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
	}

	.info-box {
		padding: 1rem;
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.2);
		border-radius: 8px;
	}

	.info-box p {
		margin: 0 0 0.75rem;
		color: rgba(242, 243, 255, 0.9);
		font-size: 0.875rem;
	}

	.info-box ul {
		margin: 0;
		padding-left: 1.5rem;
		color: rgba(242, 243, 255, 0.7);
		font-size: 0.875rem;
	}

	.info-box li {
		margin-bottom: 0.5rem;
	}

	.info-box li:last-child {
		margin-bottom: 0;
	}
</style>
