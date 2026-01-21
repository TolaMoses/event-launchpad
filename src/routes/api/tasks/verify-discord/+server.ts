/**
 * Discord Verification API
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
import { discordVerificationSchema } from '$lib/shared/validation/schemas/task.schema';

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
		`discord-verify:${locals.user.id}`,
		RATE_LIMITS.verification
	);

	// 3. Validate input
	const validated = await validateBody(request, discordVerificationSchema);
	const { taskId, eventId, serverId } = validated;

	// 4. Idempotency guard (prevent duplicate verification within 1 minute)
	const idempotencyKey = `discord-verify:${taskId}:${locals.user.id}`;

	const isFirstAttempt = await idempotencyGuard.checkAndSet(idempotencyKey, 60);
	if (!isFirstAttempt) {
		return json(
			{ error: 'Verification already in progress. Please wait a moment.' },
			{ status: 409 }
		);
	}

	try {
		// 5. Get user's Discord connection
		const { data: connection, error: connectionError } = await supabaseAdmin
			.from('social_connections')
			.select('*')
			.eq('user_id', locals.user.id)
			.eq('platform', 'discord')
			.single();

		if (connectionError || !connection) {
			await idempotencyGuard.remove(idempotencyKey);
			return json(
				{ error: 'Discord account not connected. Please connect your account first.' },
				{ status: 400 }
			);
		}

		// Check if token is expired
		if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
			await idempotencyGuard.remove(idempotencyKey);
			return json(
				{ error: 'Discord token expired. Please reconnect your account.' },
				{ status: 401 }
			);
		}

		const discordUserId = connection.platform_user_id;
		const botToken = process.env.DISCORD_BOT_TOKEN;

		if (!botToken) {
			await idempotencyGuard.remove(idempotencyKey);
			return json(
				{ error: 'Discord bot not configured' },
				{ status: 500 }
			);
		}

		// 6. Verify membership with retry logic
		const isMember = await retryWithBackoff(async () => {
			return await verifyGuildMembership(botToken, serverId, discordUserId);
		});

		if (!isMember) {
			await idempotencyGuard.remove(idempotencyKey);
			return json(
				{ error: 'You are not a member of this Discord server. Please join the server and try again.' },
				{ status: 400 }
			);
		}

		// 7. Mark idempotency as complete
		await idempotencyGuard.markComplete(idempotencyKey);

		return json({
			verified: true,
			message: 'Discord membership verified successfully'
		});
	} catch (err: any) {
		console.error('Discord verification error:', err);
		
		// Remove idempotency key on error to allow retry
		await idempotencyGuard.remove(idempotencyKey);
		
		return json(
			{ error: 'Failed to verify Discord membership. Please try again.' },
			{ status: 500 }
		);
	}
};

async function verifyGuildMembership(
	botToken: string,
	guildId: string,
	userId: string
): Promise<boolean> {
	try {
		// Check if user is a member of the guild
		const response = await fetch(
			`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
			{
				headers: {
					'Authorization': `Bot ${botToken}`
				}
			}
		);

		// 200 = User is a member
		if (response.ok) {
			return true;
		}

		// 404 = User is not a member
		if (response.status === 404) {
			return false;
		}

		// 403 = Bot doesn't have permission or isn't in guild
		if (response.status === 403) {
			throw new Error('Bot does not have permission to view members or is not in the server');
		}

		// Other errors
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.message || `Discord API error: ${response.status}`);
	} catch (err) {
		console.error('Guild membership check error:', err);
		throw err;
	}
}
