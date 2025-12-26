export interface ScorelinePredictionConfig {
  sportType: 'football' | 'tennis' | 'basketball' | 'other';
  homeTeam: string; // or Player 1
  awayTeam: string; // or Player 2
  matchDate?: string;
  matchTime?: string;
  description?: string;
  // Point value for correct prediction (for community events)
  correctPredictionPoints?: number;
}

const defaultScorelinePredictionConfig: ScorelinePredictionConfig = {
  sportType: 'football',
  homeTeam: '',
  awayTeam: '',
  matchDate: '',
  matchTime: '',
  description: '',
  correctPredictionPoints: 0
};

export function createDefaultScorelinePredictionConfig(): ScorelinePredictionConfig {
  return JSON.parse(JSON.stringify(defaultScorelinePredictionConfig));
}

export function validateScorelinePredictionConfig(config: ScorelinePredictionConfig): string[] {
  const errors: string[] = [];

  if (!config.homeTeam.trim()) {
    errors.push(config.sportType === 'tennis' ? "Enter Player 1 name" : "Enter home team name");
  }

  if (!config.awayTeam.trim()) {
    errors.push(config.sportType === 'tennis' ? "Enter Player 2 name" : "Enter away team name");
  }

  return errors;
}
