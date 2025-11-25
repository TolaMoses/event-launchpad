export interface ContentTaskConfig {
  submissionMethod: "link";
  instructions: string;
}

const defaultContentTaskConfig: ContentTaskConfig = {
  submissionMethod: "link",
  instructions: ""
};

export function createDefaultContentTaskConfig(): ContentTaskConfig {
  return JSON.parse(JSON.stringify(defaultContentTaskConfig));
}

export function validateContentTaskConfig(config: ContentTaskConfig): string[] {
  const errors: string[] = [];

  if (!config.instructions.trim()) {
    errors.push("Provide instructions for participants");
  }

  return errors;
}
