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
	const rateLimitKey = `discord_verify:${locals.user.id}`;
	const rateLimit = checkRateLimit(rateLimitKey, { maxRequests: 10, windowMs: 60000 });

	if (!rateLimit.allowed) {
		throw error(429, `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} seconds.`);
	}

	const body = await request.json();
	const { serverId, guildId } = body;
	
	// Support both serverId and guildId for compatibility
	const targetGuildId = serverId || guildId;

	if (!targetGuildId) {
		throw error(400, 'Server ID is required');
	}

	try {
		// Get user's Discord connection
		const { data: connection } = await supabaseAdmin
			.from('social_connections')
			.select('*')
			.eq('user_id', locals.user.id)
			.eq('platform', 'discord')
			.single();

		if (!connection) {
			throw error(400, 'Discord account not connected');
		}

		// Check if token is expired
		if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
			throw error(401, 'Discord token expired. Please reconnect your account.');
		}

		const discordUserId = connection.platform_user_id;
		const botToken = process.env.DISCORD_BOT_TOKEN;

		if (!botToken) {
			throw error(500, 'Discord bot not configured');
		}

		// Verify membership with retry logic
		const isMember = await retryWithBackoff(async () => {
			return await verifyGuildMembership(botToken, targetGuildId, discordUserId);
		});

		if (!isMember) {
			throw error(400, 'You are not a member of this Discord server. Please join the server and try again.');
		}

		return json({
			verified: true,
			message: 'Discord membership verified successfully',
			remaining: rateLimit.remaining
		});
	} catch (err: any) {
		console.error('Discord verification error:', err);
		
		if (err.status) {
			throw err; // Re-throw SvelteKit errors
		}
		
		throw error(500, 'Failed to verify Discord membership');
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
