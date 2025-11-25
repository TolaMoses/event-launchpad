export interface ReferralTaskConfig {
  requireReferralCode: boolean;
  generateUniqueCodes: boolean;
  minReferrals: number | null;
  referralInstructions: string;
  rewardPerReferral: string;
}

const defaultReferralTaskConfig: ReferralTaskConfig = {
  requireReferralCode: false,
  generateUniqueCodes: false,
  minReferrals: null,
  referralInstructions: "",
  rewardPerReferral: ""
};

export function createDefaultReferralTaskConfig(): ReferralTaskConfig {
  return JSON.parse(JSON.stringify(defaultReferralTaskConfig));
}

export function validateReferralTaskConfig(config: ReferralTaskConfig): string[] {
  const errors: string[] = [];

  if (!config.requireReferralCode && !config.generateUniqueCodes && !config.minReferrals) {
    errors.push("Configure at least one referral requirement");
  }

  if (!config.referralInstructions.trim()) {
    errors.push("Provide instructions on how referrals are tracked");
  }

  if (config.minReferrals !== null && (config.minReferrals < 0 || !Number.isInteger(config.minReferrals))) {
    errors.push("Minimum referrals must be a non-negative integer");
  }

  return errors;
}
