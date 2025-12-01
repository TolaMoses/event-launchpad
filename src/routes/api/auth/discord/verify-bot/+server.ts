import { json, error } from '@sveltejs/kit';

export async function POST({ request, locals }: any) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const { guildId } = await request.json();

	if (!guildId) {
		throw error(400, 'Guild ID is required');
	}

	try {
		const botToken = process.env.DISCORD_BOT_TOKEN;
		if (!botToken) {
			throw new Error('Discord bot token not configured');
		}

		// Check if bot is in the guild
		const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
			headers: {
				'Authorization': `Bot ${botToken}`
			}
		});

		if (guildResponse.status === 404) {
			return json({ botInGuild: false });
		}

		if (!guildResponse.ok) {
			throw new Error('Failed to check bot status');
		}

		// Bot is in the guild
		return json({ botInGuild: true });
	} catch (err) {
		console.error('Bot verification error:', err);
		throw error(500, 'Failed to verify bot');
	}
}
