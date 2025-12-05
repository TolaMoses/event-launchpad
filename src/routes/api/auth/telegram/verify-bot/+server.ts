import { json, error } from '@sveltejs/kit';

export async function POST({ request, locals }: any) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const { chatId } = await request.json();

	console.log('Telegram bot verification request:', { chatId, userId: locals.user.id });

	if (!chatId) {
		throw error(400, 'Chat ID is required');
	}

	try {
		const botToken = process.env.TELEGRAM_BOT_TOKEN;
		if (!botToken) {
			console.error('TELEGRAM_BOT_TOKEN not configured');
			throw error(500, 'Telegram bot token not configured');
		}

		// Check if bot is in the chat (channel/group)
		// Telegram API uses GET with query params
		const url = new URL(`https://api.telegram.org/bot${botToken}/getChat`);
		url.searchParams.set('chat_id', chatId);
		
		console.log('Calling Telegram API:', url.toString().replace(botToken, 'REDACTED'));
		
		const response = await fetch(url.toString());
		const data = await response.json();

		console.log('Telegram API response:', { 
			ok: response.ok, 
			status: response.status,
			dataOk: data.ok,
			errorCode: data.error_code,
			description: data.description
		});

		if (!response.ok || !data.ok) {
			// Bot not in chat or chat doesn't exist
			if (data.error_code === 400 || data.error_code === 403) {
				console.log('Bot not in chat (400/403)');
				return json({ botInChat: false, error: data.description });
			}
			
			console.error('Telegram API error:', data);
			throw error(400, data.description || 'Failed to check bot status');
		}

		// Bot can access the chat, so it's a member
		console.log('Bot verified in chat:', chatId);
		return json({ botInChat: true, chatInfo: data.result });
	} catch (err: any) {
		console.error('Telegram bot verification error:', err);
		if (err.status) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, err.message || 'Failed to verify bot');
	}
}
