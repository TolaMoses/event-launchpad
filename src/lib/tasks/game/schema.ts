export interface GameTaskConfig {
  playFreeGame: boolean;
  reachScore: boolean;
  completeQuest: boolean;
  spinWheel: boolean;
  dailyClaim: boolean;
  gameLink: string;
  apiIdentifier: string;
  minimumScore: string;
  questDescription: string;
}

const defaultGameTaskConfig: GameTaskConfig = {
  playFreeGame: false,
  reachScore: false,
  completeQuest: false,
  spinWheel: false,
  dailyClaim: false,
  gameLink: "",
  apiIdentifier: "",
  minimumScore: "",
  questDescription: ""
};

export function createDefaultGameTaskConfig(): GameTaskConfig {
  return JSON.parse(JSON.stringify(defaultGameTaskConfig));
}

export function validateGameTaskConfig(config: GameTaskConfig): string[] {
  const errors: string[] = [];

  if (
    !config.playFreeGame &&
    !config.reachScore &&
    !config.completeQuest &&
    !config.spinWheel &&
    !config.dailyClaim
  ) {
    errors.push("Select at least one game or challenge action");
  }

  if (
    (config.playFreeGame || config.reachScore || config.completeQuest || config.spinWheel) &&
    !config.gameLink.trim()
  ) {
    errors.push("Provide a link to the game or challenge");
  }

  if (config.reachScore && !config.minimumScore.trim()) {
    errors.push("Define the minimum score required");
  }

  if (config.completeQuest && !config.questDescription.trim()) {
    errors.push("Describe the quest requirements");
  }

  if (config.dailyClaim && !config.apiIdentifier.trim()) {
    errors.push("Provide the API identifier for daily claim tracking");
  }

  return errors;
}
