import { json } from '@sveltejs/kit';

export async function GET() {
	try {
		const clientId = process.env.DISCORD_CLIENT_ID;
		
		if (!clientId) {
			console.error('DISCORD_CLIENT_ID not configured');
			return json({ clientId: '' }, { status: 500 });
		}

		return json({ clientId });
	} catch (err) {
		console.error('Failed to fetch Discord bot config:', err);
		return json({ clientId: '' }, { status: 500 });
	}
}
