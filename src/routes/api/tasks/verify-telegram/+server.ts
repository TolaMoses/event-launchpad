/**
 * Telegram Verification API
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
import { telegramVerificationSchema } from '$lib/shared/validation/schemas/task.schema';

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
		`telegram-verify:${locals.user.id}`,
		RATE_LIMITS.verification
	);

	// 3. Validate input
	const validated = await validateBody(request, telegramVerificationSchema);
	const { taskId, eventId, channelId } = validated;

	// 4. Idempotency guard (prevent duplicate verification within 1 minute)
	const idempotencyKey = `telegram-verify:${taskId}:${locals.user.id}`;

	const isFirstAttempt = await idempotencyGuard.checkAndSet(idempotencyKey, 60);
	if (!isFirstAttempt) {
		return json(
			{ error: 'Verification already in progress. Please wait a moment.' },
			{ status: 409 }
		);
	}

	try {
		// 5. Get user's Telegram connection
		const { data: connection, error: connectionError } = await supabaseAdmin
			.from('social_connections')
			.select('*')
			.eq('user_id', locals.user.id)
			.eq('platform', 'telegram')
			.single();

		if (connectionError || !connection) {
			await idempotencyGuard.remove(idempotencyKey);
			return json(
				{ error: 'Telegram account not connected. Please connect your account first.' },
				{ status: 400 }
			);
		}

		const telegramUserId = connection.platform_user_id;
		const botToken = process.env.TELEGRAM_BOT_TOKEN;

		if (!botToken) {
			await idempotencyGuard.remove(idempotencyKey);
			return json(
				{ error: 'Telegram bot not configured' },
				{ status: 500 }
			);
		}

		// 6. Verify membership with retry logic
		const isMember = await retryWithBackoff(async () => {
			return await verifyChannelMembership(botToken, channelId, telegramUserId);
		});

		if (!isMember) {
			await idempotencyGuard.remove(idempotencyKey);
			return json(
				{ error: 'You are not a member of this Telegram channel. Please join the channel and try again.' },
				{ status: 400 }
			);
		}

		// 7. Mark idempotency as complete
		await idempotencyGuard.markComplete(idempotencyKey);

		return json({
			verified: true,
			message: 'Telegram membership verified successfully'
		});
	} catch (err: any) {
		console.error('Telegram verification error:', err);
		
		// Remove idempotency key on error to allow retry
		await idempotencyGuard.remove(idempotencyKey);
		
		return json(
			{ error: 'Failed to verify Telegram membership. Please try again.' },
			{ status: 500 }
		);
	}
};

async function verifyChannelMembership(
	botToken: string,
	chatId: string,
	userId: string
): Promise<boolean> {
	try {
		// Check if user is a member of the channel/group
		const response = await fetch(
			`https://api.telegram.org/bot${botToken}/getChatMember`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					chat_id: chatId,
					user_id: parseInt(userId)
				})
			}
		);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.description || `Telegram API error: ${response.status}`);
		}

		const data = await response.json();

		if (!data.ok) {
			throw new Error(data.description || 'Failed to check membership');
		}

		// Check member status
		const status = data.result.status;
		
		// Valid member statuses
		const validStatuses = ['creator', 'administrator', 'member'];
		
		// User is a member if status is one of the valid ones
		return validStatuses.includes(status);
	} catch (err) {
		console.error('Channel membership check error:', err);
		throw err;
	}
}
