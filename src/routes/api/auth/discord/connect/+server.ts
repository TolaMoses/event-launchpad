import { error, redirect } from '@sveltejs/kit';
import crypto from 'crypto';

export async function GET({ url, locals, cookies }: any) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Generate state for CSRF protection
	const state = crypto.randomBytes(32).toString('hex');

	// Store state in cookie
	cookies.set('discord_oauth_state', state, {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 60 * 10 // 10 minutes
	});

	// Store return URL
	const returnTo = url.searchParams.get('returnTo') || '/dashboard';
	cookies.set('oauth_return_to', returnTo, {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 60 * 10
	});

	// Check if Discord OAuth is configured
	const clientId = process.env.DISCORD_CLIENT_ID;
	if (!clientId) {
		console.error('DISCORD_CLIENT_ID environment variable is not set');
		throw error(500, 'Discord OAuth is not configured. Please set DISCORD_CLIENT_ID in your .env file.');
	}

	// Build Discord OAuth URL
	const discordAuthUrl = new URL('https://discord.com/api/oauth2/authorize');
	discordAuthUrl.searchParams.set('response_type', 'code');
	discordAuthUrl.searchParams.set('client_id', clientId);
	discordAuthUrl.searchParams.set('redirect_uri', `${url.origin}/api/auth/discord/callback`);
	discordAuthUrl.searchParams.set('scope', 'identify guilds guilds.members.read');
	discordAuthUrl.searchParams.set('state', state);

	console.log('Redirecting to Discord OAuth with client_id:', clientId);

	throw redirect(302, discordAuthUrl.toString());
}
