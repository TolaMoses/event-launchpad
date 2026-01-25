/**
 * Get user's Discord guilds (servers) where they have admin permissions
 * Used for event creators to select which server participants should join
 */
import { json, error } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export async function GET({ locals }: any) {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    try {
        // Get user's Discord connection
        const { data: connection, error: connectionError } = await supabaseAdmin
            .from('social_connections')
            .select('*')
            .eq('user_id', locals.user.id)
            .eq('platform', 'discord')
            .single();

        if (connectionError || !connection) {
            return json({
                connected: false,
                guilds: [],
                error: 'Discord account not connected'
            });
        }

        // Check if token is expired
        if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
            // Token expired - user needs to reconnect
            return json({
                connected: false,
                guilds: [],
                error: 'Discord token expired. Please reconnect your account.'
            });
        }

        // Fetch user's guilds from Discord API
        const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
            headers: {
                'Authorization': `Bearer ${connection.access_token}`
            }
        });

        if (!guildsResponse.ok) {
            const errorData = await guildsResponse.json().catch(() => ({}));
            console.error('Failed to fetch Discord guilds:', errorData);

            if (guildsResponse.status === 401) {
                return json({
                    connected: false,
                    guilds: [],
                    error: 'Discord session expired. Please reconnect your account.'
                });
            }

            throw new Error('Failed to fetch guilds from Discord');
        }

        const allGuilds = await guildsResponse.json();

        // Filter to only guilds where user has admin or manage server permissions
        // Permission flags: ADMINISTRATOR = 0x8, MANAGE_GUILD = 0x20
        const adminGuilds = allGuilds.filter((guild: any) => {
            const permissions = BigInt(guild.permissions);
            const isAdmin = (permissions & BigInt(0x8)) !== BigInt(0); // ADMINISTRATOR
            const canManageGuild = (permissions & BigInt(0x20)) !== BigInt(0); // MANAGE_GUILD
            return isAdmin || canManageGuild;
        });

        // Return simplified guild data
        const guilds = adminGuilds.map((guild: any) => ({
            id: guild.id,
            name: guild.name,
            icon: guild.icon
                ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
                : null
        }));

        return json({
            connected: true,
            guilds,
            username: connection.username
        });
    } catch (err) {
        console.error('Error fetching Discord guilds:', err);
        throw error(500, 'Failed to fetch Discord servers');
    }
}
