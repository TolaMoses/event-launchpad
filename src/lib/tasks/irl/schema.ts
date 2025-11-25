export interface IrlTaskConfig {
  takePhoto: boolean;
  attendMeetup: boolean;
  scanQr: boolean;
  physicalChallenge: boolean;
  description: string;
  qrCodeValue: string;
  proofRequirements: string;
}

const defaultIrlTaskConfig: IrlTaskConfig = {
  takePhoto: false,
  attendMeetup: false,
  scanQr: false,
  physicalChallenge: false,
  description: "",
  qrCodeValue: "",
  proofRequirements: ""
};

export function createDefaultIrlTaskConfig(): IrlTaskConfig {
  return JSON.parse(JSON.stringify(defaultIrlTaskConfig));
}

export function validateIrlTaskConfig(config: IrlTaskConfig): string[] {
  const errors: string[] = [];

  if (
    !config.takePhoto &&
    !config.attendMeetup &&
    !config.scanQr &&
    !config.physicalChallenge
  ) {
    errors.push("Select at least one IRL task variant");
  }

  if (!config.description.trim()) {
    errors.push("Provide instructions or description for the IRL task");
  }

  if (config.scanQr && !config.qrCodeValue.trim()) {
    errors.push("Specify the QR code value for verification");
  }

  if ((config.takePhoto || config.physicalChallenge) && !config.proofRequirements.trim()) {
    errors.push("Define proof requirements for photo/challenge tasks");
  }

  return errors;
}
