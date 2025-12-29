<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { ASSETS, getAllAvatars, AVATAR_CATEGORIES, getAvatarsByCategory } from '$lib/config/assets';

	let user: any = null;
	let loading = true;
	let saving = false;
	let error = '';
	let success = '';

	// Form fields
	let username = '';
	let selectedAvatar = '';
	let originalUsername = '';
	let usernameInput: HTMLInputElement;

	// UI state
	let showAvatarPicker = false;
	let selectedCategory = 'animals';
	let checkingUsername = false;
	let usernameAvailable = true;

	// Connected accounts
	let connectedAccounts = {
		discord: null as any,
		telegram: null as any,
		wallet: null as any
	};

	onMount(async () => {
		await loadUserProfile();
		
		// Auto-focus username input if redirected here
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get('required') === 'username' && usernameInput) {
			setTimeout(() => {
				usernameInput?.focus();
				usernameInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}, 300);
		}
	});

	async function loadUserProfile() {
		loading = true;
		const { data: { user: authUser } } = await supabase.auth.getUser();

		if (!authUser) {
			goto('/');
			return;
		}

		const { data, error: fetchError } = await supabase
			.from('users')
			.select('*')
			.eq('id', authUser.id)
			.single();

		if (fetchError || !data) {
			error = 'Failed to load profile';
			loading = false;
			return;
		}

		user = data;
		username = data.username || '';
		originalUsername = data.username || '';
		selectedAvatar = data.profile_picture || ASSETS.avatars.default;
		connectedAccounts = {
			discord: data.connected_accounts?.discord || null,
			telegram: data.connected_accounts?.telegram || null,
			wallet: data.wallet_address ? { address: data.wallet_address } : null
		};

		loading = false;
	}

	async function checkUsernameAvailability() {
		if (!username || username === originalUsername) {
			usernameAvailable = true;
			return;
		}

		// Validate format
		const usernameRegex = /^[a-z0-9_]{3,20}$/;
		if (!usernameRegex.test(username)) {
			usernameAvailable = false;
			error = 'Username must be 3-20 characters, lowercase letters, numbers, and underscores only';
			return;
		}

		checkingUsername = true;
		const { data, error: checkError } = await supabase
			.from('users')
			.select('username')
			.eq('username', username)
			.single();

		checkingUsername = false;

		if (data) {
			usernameAvailable = false;
			error = 'Username already taken';
		} else {
			usernameAvailable = true;
			error = '';
		}
	}

	async function saveProfile() {
		if (!usernameAvailable) {
			error = 'Please choose a different username';
			return;
		}

		saving = true;
		error = '';
		success = '';

		const updates: any = {
			profile_picture: selectedAvatar
		};

		if (username && username !== originalUsername) {
			updates.username = username;
		}

		const { error: updateError } = await supabase
			.from('users')
			.update(updates)
			.eq('id', user.id);

		if (updateError) {
			error = 'Failed to save profile: ' + updateError.message;
			saving = false;
			return;
		}

		success = 'Profile updated successfully!';
		originalUsername = username;
		saving = false;

		// Reload profile
		setTimeout(() => {
			success = '';
			loadUserProfile();
		}, 2000);
	}

	function selectAvatar(avatar: string) {
		selectedAvatar = avatar;
		showAvatarPicker = false;
	}

	async function connectDiscord() {
		// TODO: Implement Discord OAuth
		alert('Discord connection will be implemented with OAuth flow');
	}

	async function connectTelegram() {
		// TODO: Implement Telegram OAuth
		alert('Telegram connection will be implemented with Telegram Widget');
	}

	async function disconnectAccount(type: string) {
		const updatedAccounts = { ...user.connected_accounts };
		delete updatedAccounts[type];

		const { error: updateError } = await supabase
			.from('users')
			.update({ connected_accounts: updatedAccounts })
			.eq('id', user.id);

		if (!updateError) {
			loadUserProfile();
		}
	}
</script>

{#if loading}
	<div class="loading-container">
		<div class="spinner"></div>
		<p>Loading profile...</p>
	</div>
{:else if user}
	<div class="profile-container">
		<div class="profile-header">
			<h1>My Profile</h1>
			<p class="subtitle">Manage your account settings and connected accounts</p>
		</div>

		<div class="profile-content">
			<!-- Profile Picture Section -->
			<div class="profile-section">
				<h2>Profile Picture</h2>
				<div class="avatar-section">
					<div class="current-avatar">
						<img src={selectedAvatar} alt="Profile" />
					</div>
					<button class="secondary-btn" on:click={() => showAvatarPicker = !showAvatarPicker}>
						{showAvatarPicker ? 'Close Picker' : 'Change Avatar'}
					</button>
				</div>

				{#if showAvatarPicker}
					<div class="avatar-picker">
						<div class="category-tabs">
							{#each AVATAR_CATEGORIES as category}
								<button
									class="category-tab"
									class:active={selectedCategory === category.id}
									on:click={() => selectedCategory = category.id}
								>
									<span class="category-icon">{category.icon}</span>
									<span>{category.name}</span>
								</button>
							{/each}
						</div>

						<div class="avatars-grid">
							{#each getAvatarsByCategory(selectedCategory as any) as avatar}
								<button
									class="avatar-option"
									class:selected={selectedAvatar === avatar}
									on:click={() => selectAvatar(avatar)}
								>
									<img src={avatar} alt="Avatar option" />
									{#if selectedAvatar === avatar}
										<div class="selected-badge">✓</div>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Username Section -->
			<div class="profile-section" class:highlight-section={!originalUsername}>
				<h2>Username {#if !originalUsername}<span class="required-badge">Required</span>{/if}</h2>
				
				{#if !originalUsername}
					<div class="username-notice">
						<div class="notice-icon">⚠️</div>
						<div class="notice-content">
							<h3>Username Required</h3>
							<p>You need to set a username to:</p>
							<ul>
								<li>Create and manage events</li>
								<li>Participate in events and complete tasks</li>
								<li>Receive rewards and track your progress</li>
								<li>Be identified in leaderboards and event listings</li>
							</ul>
						</div>
					</div>
				{/if}

				<div class="username-section">
					<div class="form-group">
						<label for="username">Username</label>
						<div class="username-input-wrapper">
							<input
								bind:this={usernameInput}
								id="username"
								type="text"
								bind:value={username}
								on:input={checkUsernameAvailability}
								placeholder="Enter username (3-20 chars)"
								maxlength="20"
								class:error-input={!usernameAvailable && username && username !== originalUsername}
							/>
							{#if checkingUsername}
								<span class="input-icon checking">⏳</span>
							{:else if username && username !== originalUsername}
								{#if usernameAvailable}
									<span class="input-icon available">✓</span>
								{:else}
									<span class="input-icon unavailable">✗</span>
								{/if}
							{/if}
						</div>
						{#if !usernameAvailable && username && username !== originalUsername}
							<p class="error-hint">{error || 'Username already taken'}</p>
						{:else}
							<p class="field-hint">
								Lowercase letters, numbers, and underscores only. This will be used for role assignments.
							</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Connected Accounts Section -->
			<div class="profile-section">
				<h2>Connected Accounts</h2>
				<div class="connected-accounts">
					<!-- Discord -->
					<div class="account-card">
						<div class="account-info">
							<img src={ASSETS.icons.social.discord} alt="Discord" class="account-icon" />
							<div class="account-details">
								<h3>Discord</h3>
								{#if connectedAccounts.discord}
									<p class="connected">Connected as {connectedAccounts.discord.username}</p>
								{:else}
									<p class="not-connected">Not connected</p>
								{/if}
							</div>
						</div>
						{#if connectedAccounts.discord}
							<button class="disconnect-btn" on:click={() => disconnectAccount('discord')}>
								Disconnect
							</button>
						{:else}
							<button class="connect-btn" on:click={connectDiscord}>
								Connect
							</button>
						{/if}
					</div>

					<!-- Telegram -->
					<div class="account-card">
						<div class="account-info">
							<img src={ASSETS.icons.social.telegram} alt="Telegram" class="account-icon" />
							<div class="account-details">
								<h3>Telegram</h3>
								{#if connectedAccounts.telegram}
									<p class="connected">Connected as {connectedAccounts.telegram.username}</p>
								{:else}
									<p class="not-connected">Not connected</p>
								{/if}
							</div>
						</div>
						{#if connectedAccounts.telegram}
							<button class="disconnect-btn" on:click={() => disconnectAccount('telegram')}>
								Disconnect
							</button>
						{:else}
							<button class="connect-btn" on:click={connectTelegram}>
								Connect
							</button>
						{/if}
					</div>

					<!-- Wallet -->
					<div class="account-card">
						<div class="account-info">
							<img src={ASSETS.icons.wallets.metamask} alt="Wallet" class="account-icon" />
							<div class="account-details">
								<h3>EVM Wallet</h3>
								{#if connectedAccounts.wallet}
									<p class="connected">
										{connectedAccounts.wallet.address.slice(0, 6)}...{connectedAccounts.wallet.address.slice(-4)}
									</p>
								{:else}
									<p class="not-connected">Not connected</p>
								{/if}
							</div>
						</div>
						{#if connectedAccounts.wallet}
							<span class="connected-badge">✓ Connected</span>
						{:else}
							<button class="connect-btn" on:click={() => goto('/')}>
								Connect
							</button>
						{/if}
					</div>
				</div>
			</div>

			<!-- Save Button -->
			<div class="save-section">
				{#if error}
					<p class="error-message">{error}</p>
				{/if}
				{#if success}
					<p class="success-message">{success}</p>
				{/if}
				<button class="primary-btn" on:click={saveProfile} disabled={saving || !usernameAvailable}>
					{saving ? 'Saving...' : 'Save Profile'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		gap: 1rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid rgba(111, 160, 255, 0.2);
		border-top-color: #6fa0ff;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.profile-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem;
	}

	.profile-header {
		margin-bottom: 2rem;
	}

	.profile-header h1 {
		margin: 0 0 0.5rem;
		font-size: 2.5rem;
		color: #f2f3ff;
	}

	.subtitle {
		margin: 0;
		color: rgba(242, 243, 255, 0.7);
		font-size: 1.1rem;
	}

	.profile-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.profile-section {
		background: rgba(18, 20, 38, 0.82);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 2rem;
	}

	.profile-section h2 {
		margin: 0 0 1.5rem;
		font-size: 1.5rem;
		color: #f2f3ff;
	}

	.avatar-section {
		display: flex;
		align-items: center;
		gap: 2rem;
	}

	.current-avatar {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		overflow: hidden;
		border: 4px solid rgba(111, 160, 255, 0.3);
		background: rgba(255, 255, 255, 0.05);
	}

	.current-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-picker {
		margin-top: 1.5rem;
		background: rgba(12, 14, 30, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		padding: 1.5rem;
	}

	.category-tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.category-tab {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(242, 243, 255, 0.7);
		padding: 0.75rem 1.25rem;
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.category-tab:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(111, 160, 255, 0.3);
	}

	.category-tab.active {
		background: rgba(111, 160, 255, 0.2);
		border-color: #6fa0ff;
		color: #f2f3ff;
	}

	.category-icon {
		font-size: 1.2rem;
	}

	.avatars-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
		gap: 1rem;
	}

	.avatar-option {
		position: relative;
		width: 80px;
		height: 80px;
		border-radius: 50%;
		overflow: hidden;
		border: 2px solid rgba(255, 255, 255, 0.1);
		cursor: pointer;
		transition: all 0.2s ease;
		background: rgba(255, 255, 255, 0.05);
	}

	.avatar-option:hover {
		border-color: rgba(111, 160, 255, 0.5);
		transform: scale(1.05);
	}

	.avatar-option.selected {
		border-color: #6fa0ff;
		border-width: 3px;
	}

	.avatar-option img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.selected-badge {
		position: absolute;
		top: 0;
		right: 0;
		background: #6fa0ff;
		color: white;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.85rem;
		font-weight: 700;
	}

	.username-section {
		max-width: 500px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-weight: 600;
		color: #f2f3ff;
		font-size: 0.95rem;
	}

	.username-input-wrapper {
		position: relative;
	}

	.username-input-wrapper input {
		width: 100%;
		background: rgba(26, 28, 45, 0.88);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 12px;
		padding: 0.75rem 3rem 0.75rem 1rem;
		font-size: 1rem;
		color: #f6f6ff;
	}

	.input-icon {
		position: absolute;
		right: 1rem;
		top: 50%;
		transform: translateY(-50%);
		font-size: 1.2rem;
	}

	.input-icon.checking {
		color: rgba(242, 243, 255, 0.5);
	}

	.input-icon.available {
		color: #28a745;
	}

	.input-icon.unavailable {
		color: #ff6b6b;
	}

	.field-hint {
		margin: 0;
		font-size: 0.85rem;
		color: rgba(242, 243, 255, 0.6);
	}

	.error-hint {
		margin: 0.5rem 0 0;
		font-size: 0.9rem;
		color: #ff6b6b;
		font-weight: 500;
	}

	.error-input {
		border-color: #ff6b6b !important;
	}

	.highlight-section {
		border-color: rgba(255, 160, 0, 0.5);
		background: rgba(255, 160, 0, 0.05);
	}

	.required-badge {
		display: inline-block;
		background: rgba(255, 160, 0, 0.2);
		color: #ffa500;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		margin-left: 0.75rem;
		text-transform: uppercase;
	}

	.username-notice {
		display: flex;
		gap: 1rem;
		background: rgba(255, 160, 0, 0.1);
		border: 1px solid rgba(255, 160, 0, 0.3);
		border-radius: 12px;
		padding: 1.25rem;
		margin-bottom: 1.5rem;
	}

	.notice-icon {
		font-size: 2rem;
		flex-shrink: 0;
	}

	.notice-content h3 {
		margin: 0 0 0.5rem;
		color: #ffa500;
		font-size: 1.1rem;
	}

	.notice-content p {
		margin: 0 0 0.75rem;
		color: rgba(242, 243, 255, 0.9);
	}

	.notice-content ul {
		margin: 0;
		padding-left: 1.5rem;
		color: rgba(242, 243, 255, 0.8);
	}

	.notice-content li {
		margin-bottom: 0.5rem;
	}

	.connected-accounts {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.account-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem;
		background: rgba(12, 14, 30, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
	}

	.account-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.account-icon {
		width: 48px;
		height: 48px;
	}

	.account-details h3 {
		margin: 0 0 0.25rem;
		font-size: 1.1rem;
		color: #f2f3ff;
	}

	.account-details p {
		margin: 0;
		font-size: 0.9rem;
	}

	.connected {
		color: #28a745;
	}

	.not-connected {
		color: rgba(242, 243, 255, 0.5);
	}

	.connect-btn {
		background: rgba(111, 160, 255, 0.2);
		color: #6fa0ff;
		border: 1px solid rgba(111, 160, 255, 0.3);
		border-radius: 10px;
		padding: 0.75rem 1.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.connect-btn:hover {
		background: rgba(111, 160, 255, 0.3);
	}

	.disconnect-btn {
		background: rgba(218, 30, 40, 0.12);
		border: 1px solid rgba(218, 30, 40, 0.3);
		color: #ff9b9b;
		border-radius: 10px;
		padding: 0.75rem 1.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.disconnect-btn:hover {
		background: rgba(218, 30, 40, 0.2);
	}

	.connected-badge {
		color: #28a745;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.save-section {
		text-align: center;
		padding: 2rem;
	}

	.primary-btn {
		background: linear-gradient(135deg, #6fa0ff 0%, #5a8dff 100%);
		color: white;
		border: none;
		border-radius: 12px;
		padding: 1rem 3rem;
		font-size: 1.1rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.primary-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(111, 160, 255, 0.4);
	}

	.primary-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.secondary-btn {
		background: rgba(255, 255, 255, 0.08);
		color: #f2f3ff;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 10px;
		padding: 0.75rem 1.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.secondary-btn:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	.error-message {
		margin: 0 0 1rem;
		padding: 1rem;
		background: rgba(218, 30, 40, 0.12);
		border: 1px solid rgba(218, 30, 40, 0.3);
		border-radius: 8px;
		color: #ff9b9b;
	}

	.success-message {
		margin: 0 0 1rem;
		padding: 1rem;
		background: rgba(40, 167, 69, 0.12);
		border: 1px solid rgba(40, 167, 69, 0.3);
		border-radius: 8px;
		color: #28a745;
	}

	@media (max-width: 768px) {
		.profile-container {
			padding: 1rem;
		}

		.profile-header h1 {
			font-size: 2rem;
		}

		.avatar-section {
			flex-direction: column;
			align-items: flex-start;
		}

		.avatars-grid {
			grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
		}

		.avatar-option {
			width: 60px;
			height: 60px;
		}

		.account-card {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}
	}
</style>
