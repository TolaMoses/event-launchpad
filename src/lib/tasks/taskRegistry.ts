// Task registry for dynamic task component loading
// This maps task types to their display components and metadata

export const taskRegistry = {
	twitter: {
		label: 'Twitter',
		component: null, // Will be implemented later
		icon: '🐦'
	},
	discord: {
		label: 'Discord',
		component: null,
		icon: '💬'
	},
	telegram: {
		label: 'Telegram',
		component: null,
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
