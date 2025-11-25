<!-- src/routes/+layout.svelte -->

<script lang="ts">
  import "../app.css";
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

  const connecting = writable(false);
  const walletError = writable<string | null>(null);

  const walletStore = derived(
    [walletAddress, chainId, chainName, connecting, walletError],
    ([$walletAddress, $chainId, $chainName, $connecting, $error]) => ({
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

  let selectedChainId = "";
  let chainMenuOpen = false;
  let mobileMenuOpen = false;

  const logo = "/icons/phaeton.png";
  const xLogo = "/icons/x-logo.svg";
  const discordLogo = "/icons/discord-logo.svg";
  const telegramLogo = "/icons/telegram-logo.svg";

  function toggleChainMenu() {
    chainMenuOpen = !chainMenuOpen;
  }

  function closeChainMenu() {
    chainMenuOpen = false;
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
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
    await signOutWallet();
    selectedChainId = "";
    walletError.set(null);
    closeChainMenu();
    closeMobileMenu();
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
				<button class="green-button">Create Event</button>
			</a>
			<a class="home-link nav-link" href="/">Home</a>
			<a class="dashboard-link nav-link" href="/giveaways">Giveaways</a>
			<a class="dashboard-link nav-link" href="/games">Games</a>
      <a class="dashboard-link nav-link" href="/projects">My Events</a>
			<div class="wallet-area">
				{#if $walletAddress}
					<div class="wallet-info flex-center desktop-wallet" style="background-color: white;">
						<div class="wallet-details">
							<div class="chain-selector" class:open={chainMenuOpen}>
								<button type="button" class="chain-button" on:click={toggleChainMenu}>
									<span class="chain-name">{$walletStore.chainName}</span>
									<span class="chain-chevron">▾</span>
								</button>
								{#if chainMenuOpen}
									<div class="chain-dropdown">
										{#each chains as chain}
											<button
												type="button"
												on:click={() => handleChainSelect(chain.id)}
												class:selected={$walletStore.chainId === chain.id}
											>
												<span class="chain-option-name">{chain.name}</span>
												<span class="chain-option-symbol">{chain.nativeCurrency.symbol}</span>
											</button>
										{/each}
									</div>
								{/if}
							</div>
							<p class="bold-text black font-size-medium">{$walletStore.truncatedAddress}</p>
						</div>
						<button class="connect-wallet disconnect-wallet" on:click={handleDisconnect} disabled={$walletStore.connecting}>
							Disconnect
						</button>
					</div>
				{:else}
					<div class="wallet-info flex-center desktop-wallet" style="background-color: unset;">
						<button
							class="connect-wallet"
							on:click={handleConnect}
							disabled={$walletStore.connecting}
						>
							{$walletStore.connecting ? 'Connecting...' : 'Connect wallet'}
						</button>
					</div>
				{/if}
			</div>
			<label
				class="hamburger-button"
				for="mobile-menu-toggle"
				aria-label="Toggle navigation menu"
				aria-controls="mobile-menu"
				aria-expanded={mobileMenuOpen}
			>
				<span></span>
				<span></span>
				<span></span>
			</label>
		</div>
	</div>
	<div id="mobile-menu" class="mobile-menu-overlay">
		<div class="mobile-menu-content">
			<div class="mobile-menu-header">
				<a href="/" aria-label="MoonFlux home" class="logo-link mobile-logo">
					<img src={logo} alt="MoonFlux.fun's logo" />
				</a>
				<label
					for="mobile-menu-toggle"
					class="close-button"
					aria-label="Close navigation menu"
				>
					×
				</label>
			</div>
			<hr />
			<div class="mobile-menu-links">
				{#if $walletStore.connected}
					<div class="wallet-info flex-center mobile-wallet" style="background-color: white;">
						<div class="wallet-details">
							<div class="chain-selector">
								<button type="button" class="chain-button" on:click={toggleChainMenu}>
									<span class="chain-name">{$walletStore.chainName}</span>
									<span class="chain-chevron">▾</span>
								</button>
								{#if chainMenuOpen}
									<div class="chain-dropdown mobile">
										{#each chains as chain}
											<button
												type="button"
												on:click={() => handleChainSelect(chain.id, true)}
												class:selected={$walletStore.chainId === chain.id}
											>
												<span class="chain-option-name">{chain.name}</span>
												<span class="chain-option-symbol">{chain.nativeCurrency.symbol}</span>
											</button>
										{/each}
									</div>
								{/if}
							</div>
							<p class="bold-text black font-size-medium">{$walletStore.truncatedAddress}</p>
						</div>
						<button
							class="connect-wallet disconnect-wallet"
							on:click={() => { handleDisconnect(); }}
							disabled={$walletStore.connecting}
						>
							Disconnect
						</button>
					</div>
				{:else}
					<div class="wallet-info flex-center mobile-wallet" style="background-color: unset;">
						<button
							class="connect-wallet"
							on:click={() => { handleConnect(); }}
							disabled={$walletStore.connecting}
						>
							{$walletStore.connecting ? 'Connecting...' : 'Connect wallet'}
						</button>
					</div>
				{/if}
				<a class="mobile-menu-link" on:click={closeMobileMenu} href="/">Home</a>
        <a class="mobile-menu-link" on:click={closeMobileMenu} href="/projects">My Events</a>
				<a class="mobile-menu-link" on:click={closeMobileMenu} href="/giveaways">Giveaways</a>
				<a class="mobile-menu-link" on:click={closeMobileMenu} href="/games">Games</a>
				<div class="top-nav-socials mobile-socials">
					<img src={xLogo} alt="Twitter X logo" />
					<img src={discordLogo} alt="Discord logo" />
					<img src={telegramLogo} alt="Telegram logo" />
				</div>
			</div>
		</div>
	</div>
	{#if $walletStore.error && !$walletStore.connecting}
		<p class="wallet-error">{$walletStore.error}</p>
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
	.wallet-info {
		height: 0.8rem;
		gap: 0.5rem;
		margin: 0;
		line-height: 1;
		align-content: center;
		background-color: #fff;
		padding: 1rem;
		border-radius: 1rem;
	}
	.wallet-details {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		line-height: 1.2;
	}
	.wallet-info div {
		line-height: 0;
		padding: 0;
		margin: 0;
	}
	.chain-selector {
		position: relative;
	}
	.chain-selector.open .chain-chevron {
		transform: rotate(180deg);
	}
	.chain-button {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		background: #fff;
		border: none;
		padding: 0;
		cursor: pointer;
		font-size: 0.85rem;
		color: var(--text-color, #000);
	}
	.chain-button:hover {
		opacity: 0.8;
	}
	.chain-chevron {
		font-size: 0.7rem;
		transition: transform 0.2s ease;
	}
	.chain-dropdown {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		background: #0c0d11;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.5rem;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.45);
		min-width: 12rem;
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		z-index: 1100;
	}
	.chain-dropdown.mobile {
		position: static;
		width: 100%;
		margin-top: 0.75rem;
	}
	.chain-dropdown button {
		background: transparent;
		border: none;
		color: rgb(13, 112, 199);
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.75rem;
		border-radius: 0.4rem;
		cursor: pointer;
		transition: background 0.2s ease;
		font-size: 0.85rem;
	}
	.chain-dropdown button:hover,
	.chain-dropdown button.selected {
		background: rgba(80, 118, 255, 0.18);
	}
	.chain-option-name {
		font-weight: 600;
	}
	.chain-option-symbol {
		opacity: 0.65;
		font-weight: 500;
	}
	.connect-wallet {
		background-color: var(--blue-color);
		color: black;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 1rem;
		cursor: pointer;
	}
	.disconnect-wallet {
		background-color: var(--red-color);
	}
	.connect-wallet:disabled {
		opacity: 0.6;
		cursor: not-allowed;
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
	.mobile-wallet {
		width: fit-content;
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
		.mobile-menu-content .wallet-info {
			margin-top: 0.5rem;
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

