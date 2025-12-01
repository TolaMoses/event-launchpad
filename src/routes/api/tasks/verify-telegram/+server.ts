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
	const rateLimitKey = `telegram_verify:${locals.user.id}`;
	const rateLimit = checkRateLimit(rateLimitKey, { maxRequests: 10, windowMs: 60000 });

	if (!rateLimit.allowed) {
		throw error(429, `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} seconds.`);
	}

	const body = await request.json();
	const { channelId, channelUsername } = body;
	
	// Support both channel ID and username
	const chatId = channelId || channelUsername;

	if (!chatId) {
		throw error(400, 'Channel ID or username is required');
	}

	try {
		// Get user's Telegram connection
		const { data: connection } = await supabaseAdmin
			.from('social_connections')
			.select('*')
			.eq('user_id', locals.user.id)
			.eq('platform', 'telegram')
			.single();

		if (!connection) {
			throw error(400, 'Telegram account not connected');
		}

		const telegramUserId = connection.platform_user_id;
		const botToken = process.env.TELEGRAM_BOT_TOKEN;

		if (!botToken) {
			throw error(500, 'Telegram bot not configured');
		}

		// Verify membership with retry logic
		const isMember = await retryWithBackoff(async () => {
			return await verifyChannelMembership(botToken, chatId, telegramUserId);
		});

		if (!isMember) {
			throw error(400, 'You are not a member of this Telegram channel. Please join the channel and try again.');
		}

		return json({
			verified: true,
			message: 'Telegram membership verified successfully',
			remaining: rateLimit.remaining
		});
	} catch (err: any) {
		console.error('Telegram verification error:', err);
		
		if (err.status) {
			throw err; // Re-throw SvelteKit errors
		}
		
		throw error(500, 'Failed to verify Telegram membership');
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
