// Task registry for dynamic task component loading
// This maps task types to their display components and metadata
import TwitterTask from './components/TwitterTask.svelte';
import DiscordTask from './components/DiscordTask.svelte';
import TelegramTask from './components/TelegramTask.svelte';
import QuizTask from './components/QuizTask.svelte';
import PuzzleTask from './components/PuzzleTask.svelte';
import ContentSubmissionTask from './components/ContentSubmissionTask.svelte';
import ReferralTask from './components/ReferralTask.svelte';

export const taskRegistry = {
	twitter: {
		label: 'Twitter',
		component: TwitterTask,
		icon: '🐦'
	},
	social: {
		label: 'Social Task',
		component: TwitterTask,
		icon: '👥'
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
		label: 'Quiz/Trivia',
		component: QuizTask,
		icon: '❓'
	},
	puzzle: {
		label: 'Puzzle/Riddle',
		component: PuzzleTask,
		icon: '🧩'
	},
	content_submission: {
		label: 'Content Creation',
		component: ContentSubmissionTask,
		icon: '📝'
	},
	scoreline_prediction: {
		label: 'Scoreline Prediction',
		component: null, // Already handled separately
		icon: '⚽'
	},
	code_entry: {
		label: 'Code Entry',
		component: null,
		icon: '🔑'
	},
	referral: {
		label: 'Referral',
		component: ReferralTask,
		icon: '🔗'
	}
} as const;

export type TaskType = keyof typeof taskRegistry;
