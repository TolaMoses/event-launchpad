import { json, error } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export async function GET({ locals }: any) {
	if (!locals.user) {
		return json({ connected: false, guilds: [] });
	}

	try {
		// Check if user has Discord connected
		const { data: connection } = await supabaseAdmin
			.from('social_connections')
			.select('*')
			.eq('user_id', locals.user.id)
			.eq('platform', 'discord')
			.single();

		if (!connection) {
			return json({ connected: false, guilds: [] });
		}

		// Check if token is expired
		if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
			return json({ connected: false, guilds: [], tokenExpired: true });
		}

		// Fetch user's guilds from Discord
		const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
			headers: {
				'Authorization': `Bearer ${connection.access_token}`
			}
		});

		if (!guildsResponse.ok) {
			throw new Error('Failed to fetch guilds');
		}

		const guilds = await guildsResponse.json();

		// Filter to only guilds where user has admin permissions
		const adminGuilds = guilds.filter((guild: any) => {
			const permissions = BigInt(guild.permissions);
			const ADMINISTRATOR = BigInt(0x8);
			const MANAGE_GUILD = BigInt(0x20);
			return guild.owner || (permissions & (ADMINISTRATOR | MANAGE_GUILD)) !== BigInt(0);
		});

		return json({
			connected: true,
			guilds: adminGuilds.map((guild: any) => ({
				id: guild.id,
				name: guild.name,
				owner: guild.owner,
				permissions: guild.permissions
			}))
		});
	} catch (err) {
		console.error('Discord status error:', err);
		return json({ connected: false, guilds: [], error: 'Failed to fetch Discord status' });
	}
}
