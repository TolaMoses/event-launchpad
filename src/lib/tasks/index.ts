import type { TaskRegistry } from "./TaskTypes";
import SocialTask from "./social/SocialTask.svelte";
import ContentTask from "./content/ContentTask.svelte";
import QuizTask from "./quiz/QuizTask.svelte";
import PuzzleTask from "./puzzle/PuzzleTask.svelte";
import ParticipationTask from "./participation/ParticipationTask.svelte";
import GameTask from "./game/GameTask.svelte";
import ReferralTask from "./referral/ReferralTask.svelte";
import IrlTask from "./irl/IrlTask.svelte";

export const taskRegistry: TaskRegistry = {
  social: {
    label: "Social Tasks",
    component: SocialTask
  },
  content: {
    label: "Content Creation",
    component: ContentTask
  },
  quiz: {
    label: "Quiz / Trivia",
    component: QuizTask
  },
  puzzle: {
    label: "Puzzle / Riddle",
    component: PuzzleTask
  },
  participation: {
    label: "Participation Tasks",
    component: ParticipationTask
  },
  game: {
    label: "Game / Challenges",
    component: GameTask
  },
  referral: {
    label: "Referral Tasks",
    component: ReferralTask
  },
  irl: {
    label: "IRL Tasks",
    component: IrlTask
  }
};
