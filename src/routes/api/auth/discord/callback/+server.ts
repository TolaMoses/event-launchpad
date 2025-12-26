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
		const clientId = process.env.DISCORD_CLIENT_ID;
		const clientSecret = process.env.DISCORD_CLIENT_SECRET;

		if (!clientId || !clientSecret) {
			console.error('Discord OAuth not configured:', { 
				hasClientId: !!clientId, 
				hasClientSecret: !!clientSecret 
			});
			throw error(500, 'Discord OAuth is not configured. Please set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET.');
		}

		console.log('Exchanging Discord code for token...', { 
			userId: locals.user.id,
			redirectUri: `${url.origin}/api/auth/discord/callback`
		});

		// Exchange code for access token
		const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				grant_type: 'authorization_code',
				code,
				redirect_uri: `${url.origin}/api/auth/discord/callback`
			})
		});

		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.json().catch(() => ({}));
			console.error('Discord token exchange failed:', { 
				status: tokenResponse.status,
				error: errorData 
			});
			throw new Error(`Failed to exchange code for token: ${errorData.error || tokenResponse.status}`);
		}

		const tokens = await tokenResponse.json();

		// Get user info from Discord
		const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
			headers: {
				'Authorization': `Bearer ${tokens.access_token}`
			}
		});

		if (!userResponse.ok) {
			const errorData = await userResponse.json().catch(() => ({}));
			console.error('Failed to fetch Discord user info:', { 
				status: userResponse.status,
				error: errorData 
			});
			throw new Error('Failed to fetch user info');
		}

		const discordUser = await userResponse.json();
		console.log('Discord user fetched:', { 
			discordId: discordUser.id, 
			username: discordUser.username 
		});

		// Store connection in database
		const { data: dbData, error: dbError } = await supabaseAdmin
			.from('social_connections')
			.upsert({
				user_id: locals.user.id,
				platform: 'discord',
				platform_user_id: discordUser.id,
				username: `${discordUser.username}#${discordUser.discriminator || '0'}`,
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

		if (dbError) {
			console.error('Failed to store Discord connection:', dbError);
			throw new Error(`Database error: ${dbError.message}`);
		}

		console.log('Discord connection stored successfully');

		// Clear cookies
		cookies.delete('discord_oauth_state', { path: '/' });

		// Check if this was opened in a new tab (check for opener)
		const returnTo = cookies.get('oauth_return_to') || '/dashboard';
		cookies.delete('oauth_return_to', { path: '/' });

		// Redirect to success page instead of returning to the form
		throw redirect(302, '/auth/discord/success');
	} catch (err: any) {
		// Allow SvelteKit redirects/errors to bubble up
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Discord OAuth error:', err);
		throw error(500, err?.message || 'Failed to connect Discord account');
	}
}
