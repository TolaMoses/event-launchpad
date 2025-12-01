// Task registry for dynamic task component loading
// This maps task types to their display components and metadata
import TwitterTask from './components/TwitterTask.svelte';
import DiscordTask from './components/DiscordTask.svelte';
import TelegramTask from './components/TelegramTask.svelte';

export const taskRegistry = {
	twitter: {
		label: 'Twitter',
		component: TwitterTask,
		icon: '🐦'
	},
	discord: {
		label: 'Discord',
		component: DiscordTask,
		icon: '💬'
	},
	telegram: {
		label: 'Telegram',
		component: TelegramTask,
		icon: '✈️'
	},
	quiz: {
		label: 'Quiz',
		component: null,
		icon: '❓'
	},
	game: {
		label: 'Game',
		component: null,
		icon: '🎮'
	},
	puzzle: {
		label: 'Puzzle',
		component: null,
		icon: '🧩'
	},
	treasure_hunt: {
		label: 'Treasure Hunt',
		component: null,
		icon: '🗺️'
	},
	irl: {
		label: 'IRL Event',
		component: null,
		icon: '📍'
	}
} as const;

export type TaskType = keyof typeof taskRegistry;
