<!-- src/routes/+layout.svelte -->

<script lang="ts">
  import "../app.css";
  import { invalidateAll } from "$app/navigation";
  import { onMount } from "svelte";
  import { derived, get, writable } from "svelte/store";
  import {
    connectWallet,
    signInWithWallet,
    signOutWallet,
    walletAddress,
    chainId,
    chainName,
    hydrateWalletFromSession
  } from "$lib/wallet";
  import { CONTRACTS } from "$lib/contracts";
  import { ASSETS } from "$lib/config/assets";
  import LoginDropdown from "$lib/components/LoginDropdown.svelte";

  type ContractConfig = { name: string; raffle: string; rewardVault: string };

  const contractEntries = Object.entries(CONTRACTS) as [string, ContractConfig][];

  const chainSymbols: Record<number, string> = {
    84532: "ETH",
    11155111: "ETH",
    42000: "ETH",
    11155931: "RISE"
  };

  const chains = contractEntries.map(([id, config]) => ({
    id: Number(id),
    name: config.name,
    nativeCurrency: { symbol: chainSymbols[Number(id)] ?? "ETH" }
  }));

  type WalletView = {
    address: string | null;
    chainId: number | null;
    chainName: string;
    truncatedAddress: string;
    connecting: boolean;
    connected: boolean;
    error: string | null;
  };

  type SessionUser = {
    username?: string | null;
    wallet_address?: string | null;
    profile_picture?: string | null;
    user_metadata?: {
      username?: string | null;
      wallet_address?: string | null;
      profile_picture?: string | null;
    } | null;
  } | null;

  type DerivedUserInfo = {
    username?: string | null;
    wallet_address?: string | null;
    profile_picture?: string | null;
  } | null;

  const connecting = writable(false);
  const walletError = writable<string | null>(null);

  const walletStore = derived(
    [walletAddress, chainId, chainName, connecting, walletError],
    ([$walletAddress, $chainId, $chainName, $connecting, $error]): WalletView => ({
      address: $walletAddress,
      chainId: $chainId,
      chainName: $chainName ?? "Select chain",
      truncatedAddress: $walletAddress
        ? `${$walletAddress.slice(0, 6)}…${$walletAddress.slice(-4)}`
        : "",
      connecting: $connecting,
      connected: Boolean($walletAddress),
      error: $error
    })
  );

  export let data;
  
  // Reactively hydrate wallet store from server session on each navigation
  $: hydrateWalletFromSession(data?.me ?? null);

  let sessionUser: SessionUser = null;
  let walletState: WalletView = {
    address: null,
    chainId: null,
    chainName: "Select chain",
    truncatedAddress: "",
    connecting: false,
    connected: false,
    error: null
  };
  let derivedUser: DerivedUserInfo = null;
  let isLoggedIn = false;

  $: sessionUser = (data?.user ?? null) as SessionUser;
  $: walletState = $walletStore;
  $: derivedUser = sessionUser
    ? {
        username: sessionUser.username ??
          sessionUser.user_metadata?.username ??
          (walletState.truncatedAddress || "Connected Wallet"),
        wallet_address:
          sessionUser.wallet_address ??
          sessionUser.user_metadata?.wallet_address ??
          walletState.address,
        profile_picture:
          sessionUser.profile_picture ??
          sessionUser.user_metadata?.profile_picture ??
          null
      }
    : walletState.connected
    ? {
        username: walletState.truncatedAddress || "Connected Wallet",
        wallet_address: walletState.address,
        profile_picture: null
      }
    : null;
  $: isLoggedIn = Boolean(derivedUser);

  let selectedChainId = "";
  let chainMenuOpen = false;
  let mobileMenuOpen = false;

  // Use centralized asset configuration
  const logo = ASSETS.icons.ui.logo;
  const xLogo = ASSETS.icons.social.twitter;
  const discordLogo = ASSETS.icons.social.discord;
  const telegramLogo = ASSETS.icons.social.telegram;

  function toggleChainMenu() {
    chainMenuOpen = !chainMenuOpen;
  }

  function closeChainMenu() {
    chainMenuOpen = false;
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }

  function handleOverlayKey(event: KeyboardEvent) {
    if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
      closeMobileMenu();
    }
  }

  async function handleConnect() {
    if (get(connecting)) return;
    connecting.set(true);
    walletError.set(null);

    try {
      const wallet = await connectWallet();
      await signInWithWallet(wallet);

      selectedChainId = String(wallet.chainId);
      closeChainMenu();
    } catch (err) {
      console.error("Wallet connection failed", err);
      walletError.set(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      connecting.set(false);
    }
  }

  async function handleDisconnect() {
    try {
      await signOutWallet();
    } finally {
      if (typeof fetch !== "undefined") {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch (error) {
          console.warn("Failed to invalidate session server-side", error);
        }
      }
    }
    selectedChainId = "";
    walletError.set(null);
    closeChainMenu();
    closeMobileMenu();
    sessionUser = null;
    await invalidateAll();
  }

  function applyChainConfig(id: number) {
    const config = CONTRACTS[id];
    if (!config) return;

    chainId.set(id);
    chainName.set(config.name);
    selectedChainId = String(id);
  }

  async function selectChain(id: number) {
    applyChainConfig(id);

    if (typeof window === "undefined") return;

    const { ethereum } = window as typeof window & { ethereum?: { request: Function } };
    if (ethereum && get(walletAddress)) {
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${id.toString(16)}` }]
        });
        walletError.set(null);
      } catch (error: any) {
        console.error("Failed to switch chain", error);
        walletError.set(error?.message ?? "Failed to switch chain");
      }
    }
  }

  async function handleChainSelect(value: Event | number, closeMenu = false) {
    const idNum =
      typeof value === "number"
        ? value
        : Number((value.currentTarget as HTMLSelectElement).value);

    if (!Number.isFinite(idNum)) return;

    await selectChain(idNum);

    if (closeMenu) {
      closeMobileMenu();
    }

    closeChainMenu();
  }

  onMount(() => {
    hydrateWalletFromSession(data?.me ?? null);

    const storedChainId = get(chainId);
    const initialId =
      storedChainId ?? (contractEntries[0] ? Number(contractEntries[0][0]) : null);
    if (initialId != null) {
      applyChainConfig(initialId);
    }
  });

  $: if ($chainId != null && String($chainId) !== selectedChainId) {
    selectedChainId = String($chainId);
    const config = CONTRACTS[$chainId];
    if (config && $chainName !== config.name) {
      chainName.set(config.name);
    }
  }
</script>

<svelte:head>
  <title>Phaeton.fun</title>
  <meta charset="utf-8" />
  <meta
    name="description"
    content="Play, Win, Earn — Raffles, Giveaway and Play-to-Earn games powered by smart contracts."
  />
  <link rel="icon" href="/favicon.ico" />
</svelte:head>

<nav>
	<input
		id="mobile-menu-toggle"
		class="mobile-menu-toggle"
		type="checkbox"
		bind:checked={mobileMenuOpen}
		aria-hidden="true"
	/>
	<div class="nav-container">
		<div class="logo-and-socials">
			<a href="/" aria-label="MoonFlux home" class="logo-link">
				<img src={logo} alt="MoonFlux.fun's logo" />
			</a>
			<div class="top-nav-socials desktop-top-socials">
				<img src={xLogo} alt="Twitter X logo" />
				<img src={discordLogo} alt="Discord logo" />
				<img src={telegramLogo} alt="Telegram logo" />
			</div>
		</div>
		<div class="primary-links">
			<a class="launch-link" href="/projects/create-event">
				<button class="btn btn-submit">Create Event</button>
			</a>
			<a class="home-link nav-link" href="/">Home</a>
			{#if isLoggedIn}
				<a class="dashboard-link nav-link" href="/dashboard">Dashboard</a>
			{/if}
			<div class="wallet-area">
				<LoginDropdown 
					user={derivedUser}
					isLoggedIn={isLoggedIn}
					on:connectWallet={handleConnect}
					on:logout={handleDisconnect}
				/>
			</div>
			<label
				class="hamburger-button"
				for="mobile-menu-toggle"
				aria-label="Toggle navigation menu"
			>
				<span></span>
				<span></span>
				<span></span>
			</label>
		</div>
	</div>
	<div
		class="mobile-menu-overlay"
		tabindex="0"
		role="button"
		aria-label="Close navigation menu"
		on:click={closeMobileMenu}
		on:keydown={handleOverlayKey}
	>
		<div class="mobile-menu-content" on:click|stopPropagation>
			<div class="mobile-menu-header">
				<a href="/" aria-label="MoonFlux home" class="mobile-logo" on:click={closeMobileMenu}>
					<img src={logo} alt="MoonFlux.fun's logo" />
				</a>
				<button
					type="button"
					class="close-button"
					on:click|stopPropagation={closeMobileMenu}
					aria-label="Close navigation menu"
				>
					×
				</button>
			</div>
			<div class="mobile-menu-links" role="menu">
				<div class="mobile-login-wrapper">
					<LoginDropdown 
						user={derivedUser}
						isLoggedIn={isLoggedIn}
						on:connectWallet={handleConnect}
						on:logout={handleDisconnect}
					/>
				</div>
				<a class="mobile-menu-link" on:click={closeMobileMenu} href="/">Home</a>
				{#if isLoggedIn}
					<a class="mobile-menu-link" on:click={closeMobileMenu} href="/dashboard">Dashboard</a>
				{/if}
				<a class="mobile-menu-link" on:click={closeMobileMenu} href="/projects/create-event">Create Event</a>
				<div class="mobile-socials top-nav-socials">
					<img src={xLogo} alt="Twitter X logo" />
					<img src={discordLogo} alt="Discord logo" />
					<img src={telegramLogo} alt="Telegram logo" />
				</div>
			</div>
		</div>
	</div>
	{#if $walletStore.error && !$walletStore.connecting}
		<p class="wallet-error" role="alert">{$walletStore.error}</p>
	{/if}
</nav>
<hr />
<main class="page-shell"><slot /></main>

<style>
	hr {
		height: 0;
		border: 1px solid rgba(97, 85, 85, 0.4);
	}
	nav {
		position: relative;
	}
	.mobile-menu-toggle {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.nav-container {
		margin: 1rem 2rem;
		padding: 0;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1.5rem;
	}
	.mobile-menu-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}
	.mobile-logo {
		display: none;
	}
	.logo-and-socials {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.logo-link img {
		height: 2.5rem;
		width: auto;
	}
	.top-nav-socials {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.top-nav-socials img {
		width: 100%;
		height: 1.8rem;
		cursor: pointer;
	}
	.nav-link {
		text-decoration: none;
		color: aliceblue;
		font-weight: 500;
	}
	.primary-links {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.primary-links a {
		text-decoration: none;
		color: aliceblue;
		font-weight: 500;
	}
	.launch-link {
		display: flex;
		align-items: center;
	}
	.launch-link .green-button {
		white-space: nowrap;
	}
	.dashboard-link {
		display: flex;
		align-items: center;
	}
	.wallet-area {
		display: flex;
		align-items: center;
		margin-left: auto;
	}
	.hamburger-button {
		display: none;
		flex-direction: column;
		gap: 0.35rem;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
	}
	.hamburger-button span {
		width: 1.75rem;
		height: 0.18rem;
		background-color: aliceblue;
		border-radius: 999px;
	}
	.mobile-menu-overlay {
		display: none;
	}
	.mobile-menu-content {
		width: 100%;
		height: 100%;
		background-color: #060608;
		color: aliceblue;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.close-button {
		align-self: flex-end;
		background: none;
		border: none;
		color: aliceblue;
		font-size: 2.25rem;
		line-height: 1;
		cursor: pointer;
	}
	.mobile-menu-link {
		text-decoration: none;
		color: aliceblue;
		font-size: 1.1rem;
		font-weight: 600;
	}
	
	.mobile-socials {
		display: none;
	}
	.wallet-error {
		margin: 0.5rem 2rem 0;
		color: var(--red-color);
		font-size: 0.85rem;
	}
	@media (max-width: 768px) {
		hr {
			height: 0;
			border: 1px solid rgba(97, 85, 85, 0.4);
		}
		.mobile-logo {
			display: flex;
		}
		.nav-container {
			margin: 1rem;
			display: flex;
			align-items: center;
			gap: 1rem;
		}
		.logo-and-socials {
			gap: 0.5rem;
		}
		.desktop-top-socials {
			display: none;
		}
		
		.home-link.nav-link {
			font-size: 0.95rem;
		}
		.dashboard-link {
			display: none;
		}
		.wallet-area {
			display: none;
		}
		.hamburger-button {
			display: flex;
			grid-column: 4;
			justify-self: end;
		}
		.mobile-menu-overlay {
			display: flex;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.7);
			justify-content: flex-end;
			transform: translateX(100%);
			transition: transform 0.3s ease, opacity 0.3s ease;
			opacity: 0;
			pointer-events: none;
			z-index: 1000;
		}
		.mobile-menu-toggle:checked ~ .mobile-menu-overlay {
			transform: translateX(0);
			opacity: 1;
			pointer-events: auto;
		}
		.mobile-menu-links {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 2rem;
		}
		.mobile-menu-content {
			width: 100%;
			height: 100%;
			padding: 1rem;
			margin: 0;
		}
		.mobile-menu-header {
			display: flex;
			justify-content: space-between;
		}
		
		.mobile-socials {
			display: flex;
			width: fit-content;
			align-items: center;
			justify-content: center;
			gap: 1rem;
		}
	}
</style>

