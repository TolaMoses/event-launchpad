import { json, error } from '@sveltejs/kit';

export async function POST({ request, locals }: any) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const { chatId } = await request.json();

	if (!chatId) {
		throw error(400, 'Chat ID is required');
	}

	try {
		const botToken = process.env.TELEGRAM_BOT_TOKEN;
		if (!botToken) {
			throw new Error('Telegram bot token not configured');
		}

		// Check if bot is in the chat (channel/group)
		const response = await fetch(
			`https://api.telegram.org/bot${botToken}/getChat`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					chat_id: chatId
				})
			}
		);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			
			// Bot not in chat or chat doesn't exist
			if (errorData.error_code === 400 || errorData.error_code === 403) {
				return json({ botInChat: false });
			}
			
			throw new Error(errorData.description || 'Failed to check bot status');
		}

		const data = await response.json();

		if (!data.ok) {
			return json({ botInChat: false });
		}

		// Bot can access the chat, so it's a member
		return json({ botInChat: true, chatInfo: data.result });
	} catch (err) {
		console.error('Telegram bot verification error:', err);
		throw error(500, 'Failed to verify bot');
	}
}
