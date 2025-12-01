import { json, error, redirect } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import crypto from 'crypto';

export async function GET({ url, locals, cookies }: any) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Telegram uses a different OAuth flow (Telegram Login Widget)
	// Get data from query parameters
	const id = url.searchParams.get('id');
	const firstName = url.searchParams.get('first_name');
	const lastName = url.searchParams.get('last_name');
	const username = url.searchParams.get('username');
	const photoUrl = url.searchParams.get('photo_url');
	const authDate = url.searchParams.get('auth_date');
	const hash = url.searchParams.get('hash');

	if (!id || !hash || !authDate) {
		throw error(400, 'Missing required parameters');
	}

	try {
		// Verify Telegram data authenticity
		const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
		const secretKey = crypto.createHash('sha256').update(botToken).digest();

		// Build data check string
		const dataCheckArr = [];
		for (const [key, value] of url.searchParams.entries()) {
			if (key !== 'hash') {
				dataCheckArr.push(`${key}=${value}`);
			}
		}
		dataCheckArr.sort();
		const dataCheckString = dataCheckArr.join('\n');

		// Calculate hash
		const calculatedHash = crypto
			.createHmac('sha256', secretKey)
			.update(dataCheckString)
			.digest('hex');

		if (calculatedHash !== hash) {
			throw error(400, 'Invalid authentication data');
		}

		// Check if auth is not too old (24 hours)
		const authTimestamp = parseInt(authDate);
		const now = Math.floor(Date.now() / 1000);
		if (now - authTimestamp > 86400) {
			throw error(400, 'Authentication data is too old');
		}

		// Store connection in database
		await supabaseAdmin
			.from('social_connections')
			.upsert({
				user_id: locals.user.id,
				platform: 'telegram',
				platform_user_id: id,
				username: username || `${firstName} ${lastName || ''}`.trim(),
				access_token: null, // Telegram doesn't use OAuth tokens
				refresh_token: null,
				token_expires_at: null,
				metadata: {
					first_name: firstName,
					last_name: lastName,
					photo_url: photoUrl
				},
				updated_at: new Date().toISOString()
			}, {
				onConflict: 'user_id,platform'
			});

		// Redirect back to the page that initiated OAuth
		const returnTo = cookies.get('oauth_return_to') || '/dashboard';
		cookies.delete('oauth_return_to', { path: '/' });

		throw redirect(302, returnTo);
	} catch (err) {
		console.error('Telegram auth error:', err);
		throw error(500, 'Failed to connect Telegram account');
	}
}
