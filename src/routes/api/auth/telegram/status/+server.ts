import { json } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export async function GET({ locals }: any) {
    if (!locals.user) {
        return json({ connected: false, username: null });
    }

    try {
        // Check if user has Telegram connected
        const { data: connection } = await supabaseAdmin
            .from('social_connections')
            .select('id, username')
            .eq('user_id', locals.user.id)
            .eq('platform', 'telegram')
            .maybeSingle();

        if (!connection) {
            return json({ connected: false, username: null });
        }

        return json({
            connected: true,
            username: connection.username
        });
    } catch (err) {
        console.error('Telegram status error:', err);
        return json({ connected: false, username: null, error: 'Failed to fetch Telegram status' });
    }
}
