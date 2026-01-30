<script lang="ts">
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

	let username = "";
	let submitting = false;
	let error = "";

	async function handleSubmit() {
		if (readonly || !onComplete || !username.trim()) {
			error = "Please enter your Twitter username";
			return;
		}

		submitting = true;
		error = "";

		try {
			await onComplete();
		} catch (err) {
			error = err instanceof Error ? err.message : "Submission failed";
		} finally {
			submitting = false;
		}
	}

	function getProfileUrl(): string {
		if (config.twitter?.profileLink) {
			return config.twitter.profileLink;
		}
		return "";
	}

	function getProfileUsername(): string {
		const profileUrl = getProfileUrl();
		if (profileUrl) {
			// Extract username from Twitter/X URL (e.g., https://twitter.com/username or https://x.com/username)
			const match = profileUrl.match(
				/(?:twitter\.com|x\.com)\/([^\/\?]+)/,
			);
			if (match && match[1]) {
				return `@${match[1]}`;
			}
		}
		return "";
	}

	function getPostUrl(): string {
		if (config.twitter?.postLinks && config.twitter.postLinks.length > 0) {
			return config.twitter.postLinks[0];
		}
		return "";
	}

	function getTaskDescription(): string {
		const tasks: string[] = [];
		if (config.twitter?.followAccount) {
			const username = getProfileUsername();
			tasks.push(username ? `Follow ${username}` : "Follow the account");
		}
		if (config.twitter?.likePost) tasks.push("Like the post");
		if (config.twitter?.retweetPost) tasks.push("Retweet");
		if (config.twitter?.commentPost) tasks.push("Comment");
		if (config.twitter?.quotePost) tasks.push("Quote tweet");
		return tasks.join(", ") || "Complete the Twitter task";
	}
</script>

<div class="twitter-task">
	<div class="task-header">
		<div class="task-icon">🐦</div>
		<div>
			<h4>Twitter / X</h4>
			<p class="task-instructions">{getTaskDescription()}</p>
		</div>
	</div>

	<div class="task-body">
		<p class="task-notice">Complete the task to receive rewards</p>

		{#if getProfileUrl()}
			<div class="profile-section">
				{#if config.twitter?.followAccount && getProfileUsername()}
					<span class="follow-label">Follow:</span>
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

		{#if getPostUrl()}
			<a
				href={getPostUrl()}
				target="_blank"
				rel="noopener noreferrer"
				class="social-link"
			>
				🔗 Open Post
			</a>
		{/if}

		{#if !readonly}
			<div class="username-input">
				<label for="twitter-username">Your Twitter Username</label>
				<input
					id="twitter-username"
					type="text"
					placeholder="@username"
					bind:value={username}
					disabled={submitting}
				/>
			</div>
			<button
				class="submit-btn"
				on:click={handleSubmit}
				disabled={submitting || !username.trim()}
			>
				{submitting ? "Submitting..." : "Submit"}
			</button>
		{:else}
			<p class="completed-text">Task completed</p>
		{/if}

		{#if error}
			<p class="error-message">{error}</p>
		{/if}
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

	.task-notice {
		font-size: 0.875rem;
		color: rgba(242, 243, 255, 0.6);
		font-style: italic;
		margin: 0;
	}

	.profile-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.follow-label {
		font-size: 0.875rem;
		color: rgba(242, 243, 255, 0.8);
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

	.username-input {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.username-input label {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(242, 243, 255, 0.9);
	}

	.username-input input {
		padding: 0.75rem 1rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(29, 161, 242, 0.3);
		border-radius: 8px;
		color: #f2f3ff;
		font-size: 0.9rem;
	}

	.username-input input:focus {
		outline: none;
		border-color: #1da1f2;
	}

	.username-input input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-btn {
		background: linear-gradient(135deg, #1da1f2 0%, #1a8cd8 100%);
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

	.submit-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(29, 161, 242, 0.4);
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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
