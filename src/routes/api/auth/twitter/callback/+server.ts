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
	const savedState = cookies.get('twitter_oauth_state');
	if (!savedState || savedState !== state) {
		throw error(400, 'Invalid state parameter');
	}

	try {
		// Exchange code for access token
		const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Authorization': `Basic ${Buffer.from(
					`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
				).toString('base64')}`
			},
			body: new URLSearchParams({
				code,
				grant_type: 'authorization_code',
				redirect_uri: `${url.origin}/api/auth/twitter/callback`,
				code_verifier: cookies.get('twitter_code_verifier') || ''
			})
		});

		if (!tokenResponse.ok) {
			throw new Error('Failed to exchange code for token');
		}

		const tokens = await tokenResponse.json();

		// Get user info from Twitter
		const userResponse = await fetch('https://api.twitter.com/2/users/me', {
			headers: {
				'Authorization': `Bearer ${tokens.access_token}`
			}
		});

		if (!userResponse.ok) {
			throw new Error('Failed to fetch user info');
		}

		const twitterUser = await userResponse.json();

		// Store connection in database
		await supabaseAdmin
			.from('social_connections')
			.upsert({
				user_id: locals.user.id,
				platform: 'twitter',
				platform_user_id: twitterUser.data.id,
				username: twitterUser.data.username,
				access_token: tokens.access_token,
				refresh_token: tokens.refresh_token,
				token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
				metadata: { name: twitterUser.data.name },
				updated_at: new Date().toISOString()
			}, {
				onConflict: 'user_id,platform'
			});

		// Clear cookies
		cookies.delete('twitter_oauth_state', { path: '/' });
		cookies.delete('twitter_code_verifier', { path: '/' });

		// Redirect back to the page that initiated OAuth
		const returnTo = cookies.get('oauth_return_to') || '/dashboard';
		cookies.delete('oauth_return_to', { path: '/' });

		throw redirect(302, returnTo);
	} catch (err) {
		console.error('Twitter OAuth error:', err);
		throw error(500, 'Failed to connect Twitter account');
	}
}
