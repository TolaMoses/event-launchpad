export interface ParticipationTaskConfig {
  attendLiveEvent: boolean;
  submitFeedback: boolean;
  fillSurvey: boolean;
  joinLivestream: boolean;
  completeOnboarding: boolean;
  registerAccount: boolean;
  eventLink: string;
  surveyLink: string;
  livestreamLink: string;
  onboardingLink: string;
}

const defaultParticipationTaskConfig: ParticipationTaskConfig = {
  attendLiveEvent: false,
  submitFeedback: false,
  fillSurvey: false,
  joinLivestream: false,
  completeOnboarding: false,
  registerAccount: false,
  eventLink: "",
  surveyLink: "",
  livestreamLink: "",
  onboardingLink: ""
};

export function createDefaultParticipationTaskConfig(): ParticipationTaskConfig {
  return JSON.parse(JSON.stringify(defaultParticipationTaskConfig));
}

export function validateParticipationTaskConfig(config: ParticipationTaskConfig): string[] {
  const errors: string[] = [];

  if (
    !config.attendLiveEvent &&
    !config.submitFeedback &&
    !config.fillSurvey &&
    !config.joinLivestream &&
    !config.completeOnboarding &&
    !config.registerAccount
  ) {
    errors.push("Select at least one participation action");
  }

  if (config.attendLiveEvent && !config.eventLink.trim()) {
    errors.push("Provide a link or location for the live event");
  }

  if (
    (config.submitFeedback || config.fillSurvey) &&
    !config.surveyLink.trim()
  ) {
    errors.push("Provide a survey or feedback link");
  }

  if (config.joinLivestream && !config.livestreamLink.trim()) {
    errors.push("Provide a livestream link");
  }

  if (
    (config.completeOnboarding || config.registerAccount) &&
    !config.onboardingLink.trim()
  ) {
    errors.push("Provide the onboarding or registration link");
  }

  return errors;
}
