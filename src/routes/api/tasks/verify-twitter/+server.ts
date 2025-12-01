import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import { checkRateLimit } from '$lib/server/rateLimit';

// Retry helper with exponential backoff
async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	maxRetries = 3,
	baseDelay = 1000
): Promise<T> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fn();
		} catch (err) {
			lastError = err as Error;
			if (attempt < maxRetries - 1) {
				const delay = baseDelay * Math.pow(2, attempt);
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
	}

	throw lastError || new Error('Max retries exceeded');
}

export const POST: RequestHandler = async ({ request, locals, fetch }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Rate limiting: 10 verifications per minute per user
	const rateLimitKey = `twitter_verify:${locals.user.id}`;
	const rateLimit = checkRateLimit(rateLimitKey, { maxRequests: 10, windowMs: 60000 });

	if (!rateLimit.allowed) {
		throw error(429, `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} seconds.`);
	}

	const body = await request.json();
	const { action, username, tweetUrl } = body;

	try {
		// Get user's Twitter connection
		const { data: connection } = await supabaseAdmin
			.from('social_connections')
			.select('*')
			.eq('user_id', locals.user.id)
			.eq('platform', 'twitter')
			.single();

		if (!connection) {
			throw error(400, 'Twitter account not connected');
		}

		// Check if token is expired
		if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
			throw error(401, 'Twitter token expired. Please reconnect your account.');
		}

		// Verify the action with retry logic
		const verified = await retryWithBackoff(async () => {
			switch (action) {
				case 'follow':
					return await verifyFollow(connection.access_token, connection.platform_user_id, username);
				case 'like':
					return await verifyLike(connection.access_token, connection.platform_user_id, tweetUrl);
				case 'retweet':
					return await verifyRetweet(connection.access_token, connection.platform_user_id, tweetUrl);
				case 'quote':
					return await verifyQuote(connection.access_token, connection.platform_user_id, tweetUrl);
				default:
					throw new Error('Unsupported action');
			}
		});

		if (!verified) {
			throw error(400, 'Could not verify Twitter action. Please make sure you completed the task.');
		}

		return json({
			verified: true,
			message: 'Twitter action verified successfully',
			remaining: rateLimit.remaining
		});
	} catch (err: any) {
		console.error('Twitter verification error:', err);
		
		if (err.status) {
			throw err; // Re-throw SvelteKit errors
		}
		
		throw error(500, 'Failed to verify Twitter action');
	}
};

// Verification functions
async function verifyFollow(accessToken: string, userId: string, targetUsername: string): Promise<boolean> {
	// Get target user ID
	const userResponse = await fetch(`https://api.twitter.com/2/users/by/username/${targetUsername}`, {
		headers: { 'Authorization': `Bearer ${accessToken}` }
	});

	if (!userResponse.ok) {
		throw new Error('Failed to fetch target user');
	}

	const userData = await userResponse.json();
	const targetUserId = userData.data.id;

	// Check if user is following target
	const followResponse = await fetch(
		`https://api.twitter.com/2/users/${userId}/following/${targetUserId}`,
		{
			headers: { 'Authorization': `Bearer ${accessToken}` }
		}
	);

	if (!followResponse.ok && followResponse.status !== 404) {
		throw new Error('Failed to check follow status');
	}

	const followData = await followResponse.json();
	return followData.data?.following === true;
}

async function verifyLike(accessToken: string, userId: string, tweetUrl: string): Promise<boolean> {
	const tweetId = extractTweetId(tweetUrl);
	if (!tweetId) throw new Error('Invalid tweet URL');

	const response = await fetch(
		`https://api.twitter.com/2/users/${userId}/liked_tweets?tweet.fields=id`,
		{
			headers: { 'Authorization': `Bearer ${accessToken}` }
		}
	);

	if (!response.ok) {
		throw new Error('Failed to fetch liked tweets');
	}

	const data = await response.json();
	return data.data?.some((tweet: any) => tweet.id === tweetId) || false;
}

async function verifyRetweet(accessToken: string, userId: string, tweetUrl: string): Promise<boolean> {
	const tweetId = extractTweetId(tweetUrl);
	if (!tweetId) throw new Error('Invalid tweet URL');

	const response = await fetch(
		`https://api.twitter.com/2/tweets/${tweetId}/retweeted_by`,
		{
			headers: { 'Authorization': `Bearer ${accessToken}` }
		}
	);

	if (!response.ok) {
		throw new Error('Failed to check retweet status');
	}

	const data = await response.json();
	return data.data?.some((user: any) => user.id === userId) || false;
}

async function verifyQuote(accessToken: string, userId: string, tweetUrl: string): Promise<boolean> {
	const tweetId = extractTweetId(tweetUrl);
	if (!tweetId) throw new Error('Invalid tweet URL');

	const response = await fetch(
		`https://api.twitter.com/2/users/${userId}/tweets?tweet.fields=referenced_tweets`,
		{
			headers: { 'Authorization': `Bearer ${accessToken}` }
		}
	);

	if (!response.ok) {
		throw new Error('Failed to fetch user tweets');
	}

	const data = await response.json();
	return data.data?.some((tweet: any) => 
		tweet.referenced_tweets?.some((ref: any) => 
			ref.type === 'quoted' && ref.id === tweetId
		)
	) || false;
}

function extractTweetId(tweetUrl: string): string | null {
	const match = tweetUrl.match(/status\/(\d+)/);
	return match ? match[1] : null;
}
