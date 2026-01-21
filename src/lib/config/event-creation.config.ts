/**
 * Event Creation Configuration
 * 
 * Constants and options for event creation
 */

import { TOKEN_LIST } from '$lib/tokens';
import { CONTRACTS } from '$lib/contracts';
import { taskRegistry } from '$lib/tasks';
import type { TaskTypeKey, TaskRegistryEntry } from '$lib/tasks/TaskTypes';
import type { PrizeOption, ChainOption } from '$lib/shared/types/event-creation.types';

// File size limits
export const MAX_BANNER_SIZE = 500 * 1024; // 500KB
export const MAX_LOGO_SIZE = 150 * 1024;    // 150KB

// Quick Event Prize Options
export const QUICK_EVENT_PRIZE_OPTIONS: PrizeOption[] = [
  { value: 'Token', label: 'Token' },
  { value: 'ETH', label: 'Native coin' },
  { value: 'NFT', label: 'Existing NFT' },
  { value: 'MintableNFT', label: 'Mintable NFT (participants mint after tasks)' },
  { value: 'Gift', label: 'Gift/Merch (physical items shipped to winners)' },
  { value: 'Voucher', label: 'Voucher/Code (digital codes sent to winners)' }
];

// Community Event Prize Options
export const COMMUNITY_EVENT_PRIZE_OPTIONS: PrizeOption[] = [
  { value: 'CustomPoints', label: 'Custom Points (point-based reward system)' }
];

// Get task options from registry
export function getTaskOptions() {
  const registryEntries = Object.entries(taskRegistry) as [TaskTypeKey, TaskRegistryEntry][];
  
  return registryEntries
    .filter(([key]) => key !== 'irl') // Exclude IRL tasks
    .map(([value, entry]) => ({ 
      value, 
      label: entry.label 
    }));
}

// Get chain options from token list
export function getChainOptions(): ChainOption[] {
  return Object.keys(TOKEN_LIST)
    .map((id) => ({
      id,
      label: CONTRACTS[Number(id)]?.name ?? `Chain ${id}`
    }))
    .sort((a, b) => Number(a.id) - Number(b.id));
}

// Event type labels
export const EVENT_TYPE_LABELS = {
  quick_event: 'Quick Event',
  community: 'Community Event'
} as const;
