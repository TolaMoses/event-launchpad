import { error, redirect } from '@sveltejs/kit';
import crypto from 'crypto';

export async function GET({ url, locals, cookies }: any) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Generate state and code verifier for PKCE
	const state = crypto.randomBytes(32).toString('hex');
	const codeVerifier = crypto.randomBytes(32).toString('base64url');
	const codeChallenge = crypto
		.createHash('sha256')
		.update(codeVerifier)
		.digest('base64url');

	// Store state and verifier in cookies
	cookies.set('twitter_oauth_state', state, {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 60 * 10 // 10 minutes
	});

	cookies.set('twitter_code_verifier', codeVerifier, {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 60 * 10
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

	// Build Twitter OAuth URL
	const twitterAuthUrl = new URL('https://twitter.com/i/oauth2/authorize');
	twitterAuthUrl.searchParams.set('response_type', 'code');
	twitterAuthUrl.searchParams.set('client_id', process.env.TWITTER_CLIENT_ID || '');
	twitterAuthUrl.searchParams.set('redirect_uri', `${url.origin}/api/auth/twitter/callback`);
	twitterAuthUrl.searchParams.set('scope', 'tweet.read users.read follows.read like.read');
	twitterAuthUrl.searchParams.set('state', state);
	twitterAuthUrl.searchParams.set('code_challenge', codeChallenge);
	twitterAuthUrl.searchParams.set('code_challenge_method', 'S256');

	throw redirect(302, twitterAuthUrl.toString());
}
