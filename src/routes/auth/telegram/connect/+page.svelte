<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";

    let telegramBotName = "";
    let error = "";
    let loading = true;

    onMount(async () => {
        // Get bot name from config
        try {
            const response = await fetch("/api/config/telegram-bot");
            if (response.ok) {
                const data = await response.json();
                telegramBotName = data.botName;
            } else {
                error = "Failed to load Telegram configuration";
            }
        } catch (err) {
            error = "Failed to load Telegram configuration";
        }
        loading = false;

        // Store return URL in cookie for callback
        const returnTo = $page.url.searchParams.get("returnTo") || "/dashboard";
        document.cookie = `oauth_return_to=${encodeURIComponent(returnTo)}; path=/; max-age=${60 * 10}`;
    });

    function handleTelegramAuth(user: any) {
        // Redirect to callback with user data
        const params = new URLSearchParams();
        params.set("id", user.id);
        params.set("first_name", user.first_name || "");
        if (user.last_name) params.set("last_name", user.last_name);
        if (user.username) params.set("username", user.username);
        if (user.photo_url) params.set("photo_url", user.photo_url);
        params.set("auth_date", user.auth_date);
        params.set("hash", user.hash);

        window.location.href = `/api/auth/telegram/callback?${params.toString()}`;
    }

    // Expose handler globally for Telegram widget
    if (typeof window !== "undefined") {
        (window as any).onTelegramAuth = handleTelegramAuth;
    }
</script>

<svelte:head>
    <script async src="https://telegram.org/js/telegram-widget.js?22"></script>
</svelte:head>

<div class="connect-container">
    <div class="connect-card">
        <div class="connect-icon">📱</div>
        <h1>Connect Telegram</h1>
        <p>Click the button below to connect your Telegram account.</p>

        {#if loading}
            <div class="loading">Loading...</div>
        {:else if error}
            <div class="error-message">{error}</div>
        {:else if telegramBotName}
            <div class="telegram-widget">
                <script
                    async
                    src="https://telegram.org/js/telegram-widget.js?22"
                    data-telegram-login={telegramBotName}
                    data-size="large"
                    data-onauth="onTelegramAuth(user)"
                    data-request-access="write"
                ></script>
            </div>
            <p class="helper-text">
                A Telegram popup will open for authentication.
            </p>
        {:else}
            <div class="error-message">Telegram bot not configured</div>
        {/if}

        <button
            type="button"
            class="secondary-btn"
            on:click={() => window.close()}
        >
            Cancel
        </button>
    </div>
</div>

<style>
    .connect-container {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #0088cc 0%, #229ed9 100%);
        padding: 2rem;
    }

    .connect-card {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 3rem 2rem;
        max-width: 500px;
        width: 100%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .connect-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
    }

    h1 {
        font-size: 2rem;
        font-weight: 700;
        color: #1a1a1a;
        margin-bottom: 1rem;
    }

    p {
        font-size: 1.1rem;
        color: #666;
        margin-bottom: 1.5rem;
        line-height: 1.6;
    }

    .telegram-widget {
        margin: 2rem 0;
        display: flex;
        justify-content: center;
    }

    .helper-text {
        font-size: 0.9rem;
        color: #888;
        margin-top: 1rem;
    }

    .loading {
        font-size: 1rem;
        color: #0088cc;
        margin: 2rem 0;
    }

    .error-message {
        color: #e53e3e;
        background: #fed7d7;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
    }

    .secondary-btn {
        background: transparent;
        color: #0088cc;
        border: 2px solid #0088cc;
        padding: 0.75rem 2rem;
        border-radius: 10px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        margin-top: 1rem;
    }

    .secondary-btn:hover {
        background: #0088cc;
        color: white;
    }
</style>
