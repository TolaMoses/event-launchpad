import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const GET: RequestHandler = async ({ url }) => {
	const eventId = url.searchParams.get('eventId');
	const userId = url.searchParams.get('userId');

	if (!eventId || !userId) {
		throw error(400, 'Missing eventId or userId');
	}

	try {
		// Count referrals where:
		// 1. The referred user completed a task in this event
		// 2. The referred user was referred by this userId
		// 3. The referred user had no prior task completions in this event before being referred
		const { data, error: dbError } = await supabaseAdmin
			.from('event_referrals')
			.select('id', { count: 'exact' })
			.eq('event_id', eventId)
			.eq('referrer_id', userId);

		if (dbError) {
			console.error('Database error:', dbError);
			throw error(500, 'Failed to fetch referral count');
		}

		return json({ count: data?.length || 0 });
	} catch (err) {
		console.error('Error fetching referral count:', err);
		throw error(500, 'Internal server error');
	}
};
