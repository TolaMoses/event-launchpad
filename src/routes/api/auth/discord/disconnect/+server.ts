import { json, error, type RequestHandler } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export const POST: RequestHandler = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const { error: deleteError } = await supabaseAdmin
			.from('social_connections')
			.delete()
			.eq('user_id', user.id)
			.eq('platform', 'discord');

		if (deleteError) {
			console.error('Discord disconnect error:', deleteError);
			throw error(500, 'Failed to disconnect Discord account');
		}

		return json({ success: true });
	} catch (err) {
		console.error('Discord disconnect unexpected error:', err);
		throw error(500, 'Failed to disconnect Discord account');
	}
};
