export interface ContentTaskConfig {
  submitMeme: boolean;
  submitImage: boolean;
  submitVideo: boolean;
  submitExplanation: boolean;
  submitThread: boolean;
  submitFanArt: boolean;
  submitDesign: boolean;
  submissionMethod: "upload" | "link" | "either";
  instructions: string;
}

const defaultContentTaskConfig: ContentTaskConfig = {
  submitMeme: false,
  submitImage: false,
  submitVideo: false,
  submitExplanation: false,
  submitThread: false,
  submitFanArt: false,
  submitDesign: false,
  submissionMethod: "upload",
  instructions: ""
};

export function createDefaultContentTaskConfig(): ContentTaskConfig {
  return JSON.parse(JSON.stringify(defaultContentTaskConfig));
}

export function validateContentTaskConfig(config: ContentTaskConfig): string[] {
  const errors: string[] = [];

  if (
    !config.submitMeme &&
    !config.submitImage &&
    !config.submitVideo &&
    !config.submitExplanation &&
    !config.submitThread &&
    !config.submitFanArt &&
    !config.submitDesign
  ) {
    errors.push("Select at least one content submission type");
  }

  if (!config.instructions.trim()) {
    errors.push("Provide instructions for creators");
  }

  return errors;
}
