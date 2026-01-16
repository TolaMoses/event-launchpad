export interface ScorelinePredictionConfig {
  sport: 'football' | 'tennis' | 'basketball' | 'other';
  match_date: string;
  match_time?: string;
  league: {
    name: string;
    league_id?: string | null;
  };
  home_team: {
    name: string;
    team_id?: string | null;
  };
  away_team: {
    name: string;
    team_id?: string | null;
  };
  rules?: {
    exact_score_only?: boolean;
    extra_time_included?: boolean;
  };
  description?: string;
}

const defaultScorelinePredictionConfig: ScorelinePredictionConfig = {
  sport: 'football',
  match_date: '',
  match_time: '',
  league: {
    name: '',
    league_id: null
  },
  home_team: {
    name: '',
    team_id: null
  },
  away_team: {
    name: '',
    team_id: null
  },
  rules: {
    exact_score_only: true,
    extra_time_included: false
  },
  description: ''
};

export function createDefaultScorelinePredictionConfig(): ScorelinePredictionConfig {
  return JSON.parse(JSON.stringify(defaultScorelinePredictionConfig));
}

export function validateScorelinePredictionConfig(config: ScorelinePredictionConfig): string[] {
  const errors: string[] = [];

  if (!config.league?.name?.trim()) {
    errors.push(config.sport === 'tennis' ? "Enter tournament name" : "Enter league name");
  }

  if (!config.home_team?.name?.trim()) {
    errors.push(config.sport === 'tennis' ? "Enter Player 1 name" : "Enter home team name");
  }

  if (!config.away_team?.name?.trim()) {
    errors.push(config.sport === 'tennis' ? "Enter Player 2 name" : "Enter away team name");
  }

  // Home team cannot equal away team
  if (config.home_team?.name && config.away_team?.name && 
      config.home_team.name.trim().toLowerCase() === config.away_team.name.trim().toLowerCase()) {
    errors.push("Home team and away team must be different");
  }

  if (!config.match_date || !config.match_date.trim()) {
    errors.push("Enter match date");
  }

  // Match date must be in the future
  if (config.match_date) {
    const matchDate = new Date(config.match_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (matchDate < today) {
      errors.push("Match date must be in the future");
    }
  }

  return errors;
}
