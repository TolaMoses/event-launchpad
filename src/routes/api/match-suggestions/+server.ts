import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

// GET - Fetch match suggestions for a specific date from existing events
export const GET: RequestHandler = async ({ url }) => {
  const matchDate = url.searchParams.get('date');
  const sport = url.searchParams.get('sport') || 'football';

  if (!matchDate) {
    throw error(400, 'Match date is required');
  }

  // Fetch all events with scoreline_prediction tasks
  const { data: events, error: fetchError } = await supabaseAdmin
    .from('events')
    .select('tasks')
    .gte('end_time', new Date().toISOString()) // Not expired
    .order('created_at', { ascending: false })
    .limit(100);

  if (fetchError) {
    console.error('Failed to fetch match suggestions', fetchError);
    throw error(500, 'Failed to fetch match suggestions');
  }

  // Extract scoreline_prediction tasks from events
  const suggestions: Array<{
    league: string;
    home_team: string;
    away_team: string;
    match_time?: string;
  }> = [];

  events?.forEach((event) => {
    if (Array.isArray(event.tasks)) {
      event.tasks.forEach((task: any) => {
        if (task.type === 'scoreline' && task.config) {
          const config = task.config;
          // Match the date and sport
          if (config.match_date === matchDate && config.sport === sport) {
            suggestions.push({
              league: config.league?.name || '',
              home_team: config.home_team?.name || '',
              away_team: config.away_team?.name || '',
              match_time: config.match_time
            });
          }
        }
      });
    }
  });

  // Remove duplicates based on teams and league
  const uniqueSuggestions = suggestions.filter((suggestion, index, self) =>
    index === self.findIndex((s) =>
      s.league === suggestion.league &&
      s.home_team === suggestion.home_team &&
      s.away_team === suggestion.away_team
    )
  );

  return json(uniqueSuggestions);
};
