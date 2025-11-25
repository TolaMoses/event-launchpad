export interface PuzzleTaskConfig {
  instructions: string;
  expectedAnswer: string;
  hint?: string;
}

const defaultPuzzleTaskConfig: PuzzleTaskConfig = {
  instructions: "",
  expectedAnswer: "",
  hint: ""
};

export function createDefaultPuzzleTaskConfig(): PuzzleTaskConfig {
  return JSON.parse(JSON.stringify(defaultPuzzleTaskConfig));
}

export function validatePuzzleTaskConfig(config: PuzzleTaskConfig): string[] {
  const errors: string[] = [];

  if (!config.instructions.trim()) {
    errors.push("Provide puzzle or riddle instructions");
  }

  if (!config.expectedAnswer.trim()) {
    errors.push("Set the answer used for verification");
  }

  return errors;
}
