<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import { ASSETS } from '$lib/config/assets';
	
	export let user: any = null;
	export let isLoggedIn: boolean = false;

	const dispatch = createEventDispatcher();

	let showDropdown = false;
	let showLoginOptions = false;

	function toggleDropdown() {
		showDropdown = !showDropdown;
		showLoginOptions = false;
	}

	function toggleLoginOptions() {
		showLoginOptions = !showLoginOptions;
	}

	function handleWalletConnect() {
		dispatch('connectWallet');
		showLoginOptions = false;
	}

	function handleDiscordLogin() {
		// TODO: Implement Discord OAuth
		alert('Discord login will be implemented with OAuth flow');
		showLoginOptions = false;
	}

	function handleTelegramLogin() {
		// TODO: Implement Telegram OAuth
		alert('Telegram login will be implemented with Telegram Widget');
		showLoginOptions = false;
	}

	function goToProfile() {
		showDropdown = false;
		goto('/profile');
	}

	function goToDashboard() {
		showDropdown = false;
		goto('/dashboard');
	}

	function handleLogout() {
		dispatch('logout');
		showDropdown = false;
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.login-dropdown-container')) {
			showDropdown = false;
			showLoginOptions = false;
		}
	}
</script>

<svelte:window on:click={handleClickOutside} />

<div class="login-dropdown-container">
	{#if isLoggedIn && user}
		<!-- Logged In: Show Profile Picture -->
		<button class="profile-btn" on:click|stopPropagation={toggleDropdown}>
			<img 
				src={user.profile_picture || ASSETS.avatars.default} 
				alt="Profile" 
				class="profile-pic"
			/>
			{#if user.username}
				<span class="username-display">{user.username}</span>
			{/if}
		</button>

		{#if showDropdown}
			<div class="dropdown-menu" on:click|stopPropagation>
				<div class="dropdown-header">
					<img 
						src={user.profile_picture || ASSETS.avatars.default} 
						alt="Profile" 
						class="dropdown-avatar"
					/>
					<div class="user-info">
						<p class="user-name">{user.username || 'User'}</p>
						{#if user.wallet_address}
							<p class="user-wallet">
								{user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
							</p>
						{/if}
					</div>
				</div>

				<div class="dropdown-divider"></div>

				<button class="dropdown-item" on:click={goToProfile}>
					<span class="item-icon">👤</span>
					<span>My Profile</span>
				</button>

				<button class="dropdown-item" on:click={goToDashboard}>
					<span class="item-icon">📊</span>
					<span>Dashboard</span>
				</button>

				<div class="dropdown-divider"></div>

				<button class="dropdown-item logout" on:click={handleLogout}>
					<span class="item-icon">🚪</span>
					<span>Logout</span>
				</button>
			</div>
		{/if}
	{:else}
		<!-- Not Logged In: Show Login Button -->
		<button class="login-btn" on:click|stopPropagation={toggleLoginOptions}>
			<span>Login</span>
			<span class="dropdown-arrow">{showLoginOptions ? '▲' : '▼'}</span>
		</button>

		{#if showLoginOptions}
			<div class="dropdown-menu login-options" on:click|stopPropagation>
				<p class="login-title">Choose login method</p>

				<button class="login-option" on:click={handleDiscordLogin}>
					<img src={ASSETS.icons.social.discord} alt="Discord" class="login-icon" />
					<div class="login-option-text">
						<span class="option-name">Discord</span>
						<span class="option-desc">Login with Discord</span>
					</div>
				</button>

				<button class="login-option" on:click={handleTelegramLogin}>
					<img src={ASSETS.icons.social.telegram} alt="Telegram" class="login-icon" />
					<div class="login-option-text">
						<span class="option-name">Telegram</span>
						<span class="option-desc">Login with Telegram</span>
					</div>
				</button>

				<button class="login-option" on:click={handleWalletConnect}>
					<img src={ASSETS.icons.wallets.metamask} alt="Wallet" class="login-icon" />
					<div class="login-option-text">
						<span class="option-name">EVM Wallet</span>
						<span class="option-desc">Connect MetaMask or WalletConnect</span>
					</div>
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.login-dropdown-container {
		position: relative;
	}

	.profile-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 50px;
		padding: 0.4rem 1rem 0.4rem 0.4rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.profile-btn:hover {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(111, 160, 255, 0.4);
	}

	.profile-pic {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid rgba(111, 160, 255, 0.3);
	}

	.username-display {
		color: #f2f3ff;
		font-weight: 600;
		font-size: 0.95rem;
	}

	.login-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: white;
		border: none;
		border-radius: 12px;
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.login-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(111, 160, 255, 0.4);
	}

	.dropdown-arrow {
		font-size: 0.7rem;
		opacity: 0.8;
	}

	.dropdown-menu {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		background: rgba(18, 20, 38, 0.98);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		min-width: 280px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
		z-index: 1000;
		animation: slideDown 0.2s ease;
		backdrop-filter: blur(10px);
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.dropdown-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.25rem;
	}

	.dropdown-avatar {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid rgba(111, 160, 255, 0.3);
	}

	.user-info {
		flex: 1;
	}

	.user-name {
		margin: 0 0 0.25rem;
		font-weight: 700;
		font-size: 1.1rem;
		color: #f2f3ff;
	}

	.user-wallet {
		margin: 0;
		font-size: 0.85rem;
		color: rgba(242, 243, 255, 0.6);
		font-family: monospace;
	}

	.dropdown-divider {
		height: 1px;
		background: rgba(255, 255, 255, 0.1);
		margin: 0.5rem 0;
	}

	.dropdown-item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1.25rem;
		background: none;
		border: none;
		color: #f2f3ff;
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s ease;
		text-align: left;
	}

	.dropdown-item:hover {
		background: rgba(111, 160, 255, 0.1);
	}

	.dropdown-item.logout {
		color: #ff9b9b;
	}

	.dropdown-item.logout:hover {
		background: rgba(218, 30, 40, 0.1);
	}

	.item-icon {
		font-size: 1.2rem;
	}

	.login-options {
		padding: 1rem;
	}

	.login-title {
		margin: 0 0 1rem;
		padding: 0 0.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: rgba(242, 243, 255, 0.7);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.login-option {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-bottom: 0.75rem;
	}

	.login-option:last-child {
		margin-bottom: 0;
	}

	.login-option:hover {
		background: rgba(111, 160, 255, 0.1);
		border-color: rgba(111, 160, 255, 0.3);
		transform: translateX(4px);
	}

	.login-icon {
		width: 40px;
		height: 40px;
		flex-shrink: 0;
	}

	.login-option-text {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		text-align: left;
	}

	.option-name {
		font-weight: 600;
		font-size: 1rem;
		color: #f2f3ff;
	}

	.option-desc {
		font-size: 0.85rem;
		color: rgba(242, 243, 255, 0.6);
	}

	@media (max-width: 768px) {
		.username-display {
			display: none;
		}

		.dropdown-menu {
			left: 10vw;
			min-width: 260px;
		}
	}
</style>
