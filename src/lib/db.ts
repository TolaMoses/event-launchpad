// src/lib/db.ts
import { supabase } from '$lib/supabaseClient';

export async function getRafflesByHost(wallet: string) {
  const { data, error } = await supabase
    .from('raffles')
    .select('*')
    .eq('host_wallet', wallet)
    .order('end_time', { ascending: true });

  if (error) {
    console.error('Error fetching raffles:', error.message);
    return [];
  }

  // Sort ongoing first, then ended
  const now = new Date();
  const ongoing = data.filter(r => new Date(r.end_time) > now);
  const ended = data.filter(r => new Date(r.end_time) <= now);

  return [...ongoing, ...ended];
}

export async function getGiveawaysByHost(wallet: string) {
  const { data, error } = await supabase
    .from('giveaways')
    .select('*')
    .eq('host_wallet', wallet)
    .order('end_time', { ascending: true });

  if (error) {
    console.error('Error fetching giveaways:', error.message);
    return [];
  }

  // Sort ongoing first, then ended
  const now = new Date();
  const ongoing = data.filter(r => new Date(r.end_time) > now);
  const ended = data.filter(r => new Date(r.end_time) <= now);

  return [...ongoing, ...ended];
}


export async function getGamesByHost(wallet: string) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('host_wallet', wallet)
    .order('end_time', { ascending: true });

  if (error) {
    console.error('Error fetching games:', error.message);
    return [];
  }

  // Sort ongoing first, then ended
  const now = new Date();
  const ongoing = data.filter(r => new Date(r.end_time) > now);
  const ended = data.filter(r => new Date(r.end_time) <= now);

  return [...ongoing, ...ended];
}
