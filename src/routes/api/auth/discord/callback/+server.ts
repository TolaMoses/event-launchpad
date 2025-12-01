import { json, error, redirect } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export async function GET({ url, locals, cookies }: any) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	if (!code) {
		throw error(400, 'Missing authorization code');
	}

	// Verify state to prevent CSRF
	const savedState = cookies.get('discord_oauth_state');
	if (!savedState || savedState !== state) {
		throw error(400, 'Invalid state parameter');
	}

	try {
		// Exchange code for access token
		const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				client_id: process.env.DISCORD_CLIENT_ID || '',
				client_secret: process.env.DISCORD_CLIENT_SECRET || '',
				grant_type: 'authorization_code',
				code,
				redirect_uri: `${url.origin}/api/auth/discord/callback`
			})
		});

		if (!tokenResponse.ok) {
			throw new Error('Failed to exchange code for token');
		}

		const tokens = await tokenResponse.json();

		// Get user info from Discord
		const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
			headers: {
				'Authorization': `Bearer ${tokens.access_token}`
			}
		});

		if (!userResponse.ok) {
			throw new Error('Failed to fetch user info');
		}

		const discordUser = await userResponse.json();

		// Store connection in database
		await supabaseAdmin
			.from('social_connections')
			.upsert({
				user_id: locals.user.id,
				platform: 'discord',
				platform_user_id: discordUser.id,
				username: `${discordUser.username}#${discordUser.discriminator}`,
				access_token: tokens.access_token,
				refresh_token: tokens.refresh_token,
				token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
				metadata: { 
					avatar: discordUser.avatar,
					global_name: discordUser.global_name
				},
				updated_at: new Date().toISOString()
			}, {
				onConflict: 'user_id,platform'
			});

		// Clear cookies
		cookies.delete('discord_oauth_state', { path: '/' });

		// Redirect back to the page that initiated OAuth
		const returnTo = cookies.get('oauth_return_to') || '/dashboard';
		cookies.delete('oauth_return_to', { path: '/' });

		throw redirect(302, returnTo);
	} catch (err) {
		console.error('Discord OAuth error:', err);
		throw error(500, 'Failed to connect Discord account');
	}
}
