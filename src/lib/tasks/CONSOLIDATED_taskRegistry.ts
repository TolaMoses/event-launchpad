/**
 * CONSOLIDATED Task Registry
 * 
 * Single source of truth for all task types and their components
 * This replaces both index.ts and taskRegistry.ts to fix duplicate registry issue
 */

import type { TaskRegistry } from './TaskTypes';

// Import all task components
import TwitterTask from './components/TwitterTask.svelte';
import DiscordTask from './components/DiscordTask.svelte';
import TelegramTask from './components/TelegramTask.svelte';
import QuizTask from './components/QuizTask.svelte';
import PuzzleTask from './components/PuzzleTask.svelte';
import ContentSubmissionTask from './components/ContentSubmissionTask.svelte';
import ReferralTask from './components/ReferralTask.svelte';
import DiscordConfigTask from './discord/DiscordTask.svelte';

// Import legacy components
import SocialTask from './social/SocialTask.svelte';
import ContentTask from './content/ContentTask.svelte';
import ParticipationTask from './participation/ParticipationTask.svelte';
import GameTask from './game/GameTask.svelte';
import IrlTask from './irl/IrlTask.svelte';
import ScorelinePrediction from './scoreline/ScorelinePrediction.svelte';

/**
 * Main task registry - maps task type to component and metadata
 * 
 * Task types:
 * - twitter/social: Twitter/X social tasks (follow, like, retweet, etc.)
 * - discord: Discord server/role verification
 * - telegram: Telegram group/channel verification
 * - quiz: Quiz/trivia challenges
 * - puzzle: Puzzle/riddle challenges
 * - content_submission/content: Content creation tasks
 * - scoreline_prediction/scoreline: Sports score predictions
 * - code_entry: Code/password entry
 * - referral: Referral/invite tasks
 * - participation: General participation tasks
 * - game: Game/challenge tasks
 * - irl: In-real-life event tasks
 */
export const taskRegistry: TaskRegistry = {
	// Social/Twitter tasks
	twitter: {
		label: 'Twitter',
		component: TwitterTask
	},

	// Discord
	discord: {
		label: 'Discord',
		component: DiscordConfigTask
	},

	// Telegram
	telegram: {
		label: 'Telegram',
		component: TelegramTask
	},

	// Quiz/Trivia
	quiz: {
		label: 'Quiz / Trivia',
		component: QuizTask
	},

	// Puzzle/Riddle
	puzzle: {
		label: 'Puzzle / Riddle',
		component: PuzzleTask
	},

	// Content creation
	content_submission: {
		label: 'Content Creation',
		component: ContentSubmissionTask
	},
	content: {
		label: 'Content Creation',
		component: ContentTask  // Legacy component
	},

	// Scoreline prediction
	scoreline_prediction: {
		label: 'Scoreline Prediction',
		component: ScorelinePrediction
	},
	scoreline: {
		label: 'Scoreline Prediction',
		component: ScorelinePrediction
	},

	// Code entry
	code_entry: {
		label: 'Code Entry',
		component: null  // To be implemented
	},

	// Referral
	referral: {
		label: 'Referral Tasks',
		component: ReferralTask
	},

	// Participation
	participation: {
		label: 'Participation Tasks',
		component: ParticipationTask
	},

	// Game/Challenges
	game: {
		label: 'Game / Challenges',
		component: GameTask
	},

	// IRL Tasks
	irl: {
		label: 'IRL Tasks',
		component: IrlTask
	}
};

// Export type for task keys
export type TaskType = keyof typeof taskRegistry;

// Re-export types for convenience
export type { TaskRegistry, TaskRegistryEntry } from './TaskTypes';
