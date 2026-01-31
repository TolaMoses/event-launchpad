<script lang="ts">
	import { onMount } from "svelte";

	export let config: {
		twitter?: {
			followAccount?: boolean;
			likePost?: boolean;
			retweetPost?: boolean;
			commentPost?: boolean;
			quotePost?: boolean;
			profileLink?: string;
			postLinks?: string[];
		};
	};
	export let readonly = false;
	export let onComplete: (() => Promise<void>) | undefined = undefined;

	onMount(() => {
		console.log("Twitter task config:", config);
	});

	function getProfileUrl(): string {
		let url = config.twitter?.profileLink || "";
		// Ensure URL has protocol to prevent relative links
		if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
			url = "https://" + url;
		}
		return url;
	}

	function getProfileUsername(): string {
		const profileUrl = getProfileUrl();
		if (profileUrl) {
			// Extract username from Twitter/X URL
			const match = profileUrl.match(
				/(?:twitter\.com|x\.com)\/([^\/\?]+)/,
			);
			if (match && match[1]) {
				return `@${match[1]}`;
			}
		}
		return "";
	}

	function getPostUrls(): string[] {
		return config.twitter?.postLinks || [];
	}

	function getTaskActions(): string[] {
		const actions: string[] = [];
		if (config.twitter?.followAccount) {
			const username = getProfileUsername();
			actions.push(
				username ? `Follow ${username}` : "Follow the account",
			);
		}
		if (config.twitter?.likePost) actions.push("Like the post");
		if (config.twitter?.retweetPost) actions.push("Retweet");
		if (config.twitter?.commentPost) actions.push("Comment");
		if (config.twitter?.quotePost) actions.push("Quote tweet");
		return actions;
	}
</script>

<div class="twitter-task">
	<div class="task-header">
		<div class="task-icon">🐦</div>
		<div>
			<h4>Twitter / X</h4>
			<p class="task-instructions">
				Complete the following actions on Twitter/X
			</p>
		</div>
	</div>

	<div class="task-body">
		<!-- Actions list -->
		{#if getTaskActions().length > 0}
			<div class="actions-list">
				<span class="actions-label">Required Actions:</span>
				<ul>
					{#each getTaskActions() as action}
						<li>{action}</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- Profile link -->
		{#if getProfileUrl()}
			<div class="link-section">
				{#if getProfileUsername()}
					<span class="link-label">Profile to follow:</span>
					<span class="username">{getProfileUsername()}</span>
				{/if}
				<a
					href={getProfileUrl()}
					target="_blank"
					rel="noopener noreferrer"
					class="social-link"
				>
					🔗 Open Profile {getProfileUsername()
						? `(${getProfileUsername()})`
						: ""}
				</a>
			</div>
		{/if}

		<!-- Post links -->
		{#if getPostUrls().length > 0}
			<div class="link-section">
				<span class="link-label">Posts to interact with:</span>
				{#each getPostUrls() as postUrl, i}
					<a
						href={postUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="social-link"
					>
						🔗 Open Post {getPostUrls().length > 1
							? `#${i + 1}`
							: ""}
					</a>
				{/each}
			</div>
		{/if}

		<!-- Info notice - no verification -->
		<p class="info-notice">
			Complete the actions above on Twitter/X. Task completion is based on
			honor system.
		</p>
	</div>
</div>

<style>
	.twitter-task {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
		background: rgba(29, 161, 242, 0.05);
		border: 1px solid rgba(29, 161, 242, 0.2);
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

	.actions-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.actions-label,
	.link-label {
		font-size: 0.875rem;
		color: rgba(242, 243, 255, 0.8);
		font-weight: 500;
	}

	.actions-list ul {
		margin: 0;
		padding-left: 1.5rem;
	}

	.actions-list li {
		font-size: 0.9rem;
		color: rgba(242, 243, 255, 0.9);
		margin-bottom: 0.25rem;
	}

	.link-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.username {
		font-size: 1.125rem;
		font-weight: 700;
		color: #1da1f2;
	}

	.social-link {
		display: inline-block;
		color: #1da1f2;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.9rem;
		padding: 0.75rem 1rem;
		background: rgba(29, 161, 242, 0.1);
		border: 1px solid rgba(29, 161, 242, 0.3);
		border-radius: 8px;
		transition: all 0.2s ease;
		width: fit-content;
	}

	.social-link:hover {
		background: rgba(29, 161, 242, 0.2);
		transform: translateY(-2px);
	}

	.info-notice {
		font-size: 0.85rem;
		color: rgba(242, 243, 255, 0.6);
		font-style: italic;
		margin: 0;
		padding: 0.75rem;
		background: rgba(29, 161, 242, 0.05);
		border-radius: 8px;
	}
</style>
