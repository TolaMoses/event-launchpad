import { json } from '@sveltejs/kit';

export async function GET() {
	try {
		const botToken = process.env.TELEGRAM_BOT_TOKEN;

		if (!botToken) {
			return json({ botName: '' }); // Empty means not configured
		}

		// Fetch bot info from Telegram API
		const response = await fetch(
			`https://api.telegram.org/bot${botToken}/getMe`
		);

		if (response.ok) {
			const data = await response.json();
			if (data.ok && data.result.username) {
				return json({ botName: data.result.username }); // Return bot username without @
			}
		}

		// Fallback if API call fails
		return json({ botName: '' });
	} catch (err) {
		console.error('Failed to fetch bot info:', err);
		return json({ botName: '' });
	}
}
