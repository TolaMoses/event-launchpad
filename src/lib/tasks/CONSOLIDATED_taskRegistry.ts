/**
 * CONSOLIDATED Task Registry
 * 
 * Single source of truth for all task types and their components
 * This replaces both index.ts and taskRegistry.ts to fix duplicate registry issue
 */

import type { TaskRegistry } from './TaskTypes';

// Import task configuration components
import TwitterConfigTask from './twitter/TwitterTask.svelte';
import DiscordConfigTask from './discord/DiscordTask.svelte';
import TelegramConfigTask from './telegram/TelegramTask.svelte';
import QuizTask from './quiz/QuizTask.svelte';
import PuzzleTask from './puzzle/PuzzleTask.svelte';
import ContentSubmissionConfigTask from './content_submission/ContentSubmissionTask.svelte';
// Referral task removed per user requirement
import ScorelineConfigTask from './scoreline/ScorelineConfigTask.svelte';

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
 * - twitter: Twitter/X social tasks (follow, like, retweet, etc.)
 * - discord: Discord server/role verification
 * - telegram: Telegram group/channel verification
 * - quiz: Quiz/trivia challenges
 * - puzzle: Puzzle/riddle challenges
 * - content_submission: Content creation tasks
 * - scoreline_prediction/scoreline: Sports score predictions
 * - referral: Referral/invite tasks
 * - participation: General participation tasks
 * - game: Game/challenge tasks
 * - irl: In-real-life event tasks
 */
export const taskRegistry: TaskRegistry = {
	// Social/Twitter tasks
	twitter: {
		label: 'Twitter',
		component: TwitterConfigTask
	},

	// Discord
	discord: {
		label: 'Discord',
		component: DiscordConfigTask
	},

	// Telegram
	telegram: {
		label: 'Telegram',
		component: TelegramConfigTask
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
		component: ContentSubmissionConfigTask
	},

	// Scoreline prediction
	scoreline_prediction: {
		label: 'Scoreline Prediction',
		component: ScorelineConfigTask
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
