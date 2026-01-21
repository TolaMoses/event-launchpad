/**
 * Twitter Verification API
 * 
 * Updated with simplified architecture:
 * - Redis rate limiting (10 verifications/minute)
 * - Zod validation
 * - Idempotency guard (prevent duplicate verifications)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import { rateLimiter, RATE_LIMITS } from '$lib/infrastructure/redis/rateLimiter';
import { idempotencyGuard } from '$lib/infrastructure/redis/idempotency';
import { validateBody } from '$lib/server/middleware/validation';
import { twitterVerificationSchema } from '$lib/shared/validation/schemas/task.schema';

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
	// 1. Authentication check
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// 2. Rate limiting (10 verifications per minute)
	await rateLimiter.check(
		`twitter-verify:${locals.user.id}`,
		RATE_LIMITS.verification
	);

	// 3. Validate input
	const validated = await validateBody(request, twitterVerificationSchema);
	const { action, targetUsername, tweetUrl, taskId } = validated;

	// 4. Idempotency guard (prevent duplicate verification within 1 minute)
	const idempotencyKey = `twitter-verify:${taskId}:${locals.user.id}`;

	const isFirstAttempt = await idempotencyGuard.checkAndSet(idempotencyKey, 60);
	if (!isFirstAttempt) {
		return json(
			{ error: 'Verification already in progress. Please wait a moment.' },
			{ status: 409 }
		);
	}

	try {
		// 5. Get user's Twitter connection
		const { data: connection, error: connectionError } = await supabaseAdmin
			.from('social_connections')
			.select('*')
			.eq('user_id', locals.user.id)
			.eq('platform', 'twitter')
			.single();

		if (connectionError || !connection) {
			await idempotencyGuard.remove(idempotencyKey);
			return json(
				{ error: 'Twitter account not connected. Please connect your account first.' },
				{ status: 400 }
			);
		}

		// Check if token is expired
		if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
			await idempotencyGuard.remove(idempotencyKey);
			return json(
				{ error: 'Twitter token expired. Please reconnect your account.' },
				{ status: 401 }
			);
		}

		// 6. Verify the action with retry logic
		const verified = await retryWithBackoff(async () => {
			switch (action) {
				case 'follow':
					return await verifyFollow(connection.access_token, connection.platform_user_id, targetUsername || '', fetch);
				case 'like':
					return await verifyLike(connection.access_token, connection.platform_user_id, tweetUrl || '', fetch);
				case 'retweet':
					return await verifyRetweet(connection.access_token, connection.platform_user_id, tweetUrl || '', fetch);
				case 'quote':
					return await verifyQuote(connection.access_token, connection.platform_user_id, tweetUrl || '', fetch);
				default:
					throw new Error('Unsupported action');
			}
		});

		if (!verified) {
			await idempotencyGuard.remove(idempotencyKey);
			return json(
				{ error: 'Could not verify Twitter action. Please make sure you completed the task.' },
				{ status: 400 }
			);
		}

		// 7. Mark idempotency as complete
		await idempotencyGuard.markComplete(idempotencyKey);

		return json({
			verified: true,
			message: 'Twitter action verified successfully'
		});
	} catch (err: any) {
		console.error('Twitter verification error:', err);
		
		// Remove idempotency key on error to allow retry
		await idempotencyGuard.remove(idempotencyKey);
		
		return json(
			{ error: 'Failed to verify Twitter action. Please try again.' },
			{ status: 500 }
		);
	}
};

// Verification functions
async function verifyFollow(
	accessToken: string,
	userId: string,
	targetUsername: string,
	fetchFn: typeof fetch
): Promise<boolean> {
	// Get target user ID
	const userResponse = await fetchFn(`https://api.twitter.com/2/users/by/username/${targetUsername}`, {
		headers: { 'Authorization': `Bearer ${accessToken}` }
	});

	if (!userResponse.ok) {
		throw new Error('Failed to fetch target user');
	}

	const userData = await userResponse.json();
	const targetUserId = userData.data.id;

	// Check if user is following target
	const followResponse = await fetchFn(
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

async function verifyLike(
	accessToken: string,
	userId: string,
	tweetUrl: string,
	fetchFn: typeof fetch
): Promise<boolean> {
	const tweetId = extractTweetId(tweetUrl);
	if (!tweetId) throw new Error('Invalid tweet URL');

	const response = await fetchFn(
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

async function verifyRetweet(
	accessToken: string,
	userId: string,
	tweetUrl: string,
	fetchFn: typeof fetch
): Promise<boolean> {
	const tweetId = extractTweetId(tweetUrl);
	if (!tweetId) throw new Error('Invalid tweet URL');

	const response = await fetchFn(
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

async function verifyQuote(
	accessToken: string,
	userId: string,
	tweetUrl: string,
	fetchFn: typeof fetch
): Promise<boolean> {
	const tweetId = extractTweetId(tweetUrl);
	if (!tweetId) throw new Error('Invalid tweet URL');

	const response = await fetchFn(
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
