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

		// STEP 1: Get bot's own Telegram userId
		const getMeUrl = `https://api.telegram.org/bot${botToken}/getMe`;
		const meRes = await fetch(getMeUrl);
		const meData = await meRes.json();

		if (!meData.ok) {
			console.error("Failed to get bot info:", meData);
			throw error(500, 'Failed to read bot identity');
		}

		const botUserId = meData.result.id;
		console.log("Bot Telegram User ID:", botUserId);

		// STEP 2: Check bot membership using getChatMember
		const url = new URL(`https://api.telegram.org/bot${botToken}/getChatMember`);
		url.searchParams.set('chat_id', chatId);
		url.searchParams.set('user_id', botUserId.toString());

		console.log('Calling Telegram API:', url.toString().replace(botToken, 'REDACTED'));

		const response = await fetch(url.toString());
		const data = await response.json();

		console.log('Telegram API response:', {
			ok: response.ok,
			status: response.status,
			data,
		});

		if (!data.ok) {
			// Bot not in chat / insufficient permissions / invalid chat
			return json({
				botInChat: false,
				error: data.description ?? 'Bot not found in chat',
			});
		}

		const status = data.result.status;

		// Valid statuses include "administrator", "member", "creator"
		const isMember =
			status === 'administrator' ||
			status === 'creator' ||
			status === 'member';

		if (!isMember) {
			return json({
				botInChat: false,
				error: `Bot found but not a member (status: ${status})`,
			});
		}

		// Success
		return json({
			botInChat: true,
			status,
			memberInfo: data.result,
		});

	} catch (err: any) {
		console.error('Telegram bot verification error:', err);
		if (err.status) throw err;
		throw error(500, err.message || 'Failed to verify bot');
	}
}
