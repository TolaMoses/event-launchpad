/**
 * Event Creation Utilities
 * 
 * Helper functions for event creation
 */

import { taskRegistry } from '$lib/tasks';
import type { TaskTypeKey } from '$lib/tasks/TaskTypes';
import type { Task } from '$lib/shared/types/event-creation.types';

/**
 * Deep clone an object using structuredClone or JSON fallback
 */
export function clone<T>(input: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(input)
    : JSON.parse(JSON.stringify(input));
}

/**
 * Generate a unique ID (crypto.randomUUID or fallback)
 */
export function generateId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `task_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Get human-readable label for a task type
 */
export function getTaskLabel(type: TaskTypeKey): string {
  return taskRegistry[type]?.label ?? type;
}

/**
 * Create a summary string for a task configuration
 */
export function summariseTask(task: Task): string {
  const parts: string[] = [];
  
  if (task.type === 'twitter') {
    if (task.config.twitter?.followAccount) parts.push('Follow Twitter account');
    if (task.config.twitter?.likePost) parts.push('Like post');
    if (task.config.twitter?.retweetPost) parts.push('Retweet post');
    if (task.config.twitter?.commentPost) parts.push('Comment on post');
    if (task.config.twitter?.quotePost) parts.push('Quote post');
    if (task.config.twitter?.profileLink) parts.push(`Profile: ${task.config.twitter.profileLink}`);
  } else if (task.type === 'discord') {
    if (task.config.discord?.joinServer) parts.push('Join Discord server');
    if (task.config.discord?.inviteLink) parts.push(`Server: ${task.config.discord.inviteLink}`);
  } else if (task.type === 'telegram') {
    if (task.config.telegram?.joinChannel) parts.push('Join Telegram channel');
    if (task.config.telegram?.joinGroup) parts.push('Join Telegram group');
    if (task.config.telegram?.reactPinned) parts.push('React to pinned message');
    if (task.config.telegram?.shareUsername) parts.push('Share username');
  } else if (task.type === 'quiz') {
    const questionCount = task.config.questions?.length || 0;
    parts.push(`${questionCount} question${questionCount !== 1 ? 's' : ''}`);
  } else if (task.type === 'content_submission') {
    parts.push(`Submit ${task.config.contentType || 'content'}`);
    if (task.config.description) parts.push(task.config.description);
  } else if (task.type === 'code_entry') {
    parts.push('Enter valid code');
  } else if (task.type === 'scoreline_prediction') {
    if (task.config.home_team?.name && task.config.away_team?.name) {
      parts.push(`${task.config.home_team.name} vs ${task.config.away_team.name}`);
    }
    if (task.config.match_date) {
      parts.push(`Match: ${new Date(task.config.match_date).toLocaleDateString()}`);
    }
  }
  
  return parts.length > 0 ? parts.join(' • ') : 'Task configured';
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSize: number): { valid: boolean; error?: string } {
  if (file.size > maxSize) {
    const maxMB = (maxSize / 1024 / 1024).toFixed(1);
    const actualMB = (file.size / 1024 / 1024).toFixed(1);
    return {
      valid: false,
      error: `File too large: ${actualMB}MB (max: ${maxMB}MB)`
    };
  }
  return { valid: true };
}

/**
 * Validate image file type
 */
export function validateImageType(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please use JPG, PNG, GIF, or WebP.'
    };
  }
  return { valid: true };
}

/**
 * Create preview URL for uploaded file
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Validate ISO date/time string
 */
export function validateDateTime(dateStr: string, timeStr: string): { 
  valid: boolean; 
  isoString?: string; 
  error?: string;
} {
  if (!dateStr || !timeStr) {
    return { valid: false, error: 'Date and time are required' };
  }

  try {
    const isoString = `${dateStr}T${timeStr}:00.000Z`;
    const date = new Date(isoString);
    
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid date or time' };
    }
    
    return { valid: true, isoString };
  } catch (err) {
    return { valid: false, error: 'Invalid date or time format' };
  }
}

/**
 * Validate event schedule (start before end)
 */
export function validateSchedule(startISO: string, endISO: string): { 
  valid: boolean; 
  error?: string;
} {
  const start = new Date(startISO);
  const end = new Date(endISO);
  
  if (end <= start) {
    return {
      valid: false,
      error: 'End time must be after start time'
    };
  }
  
  return { valid: true };
}

/**
 * Format date for input field (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format time for input field (HH:MM)
 */
export function formatTimeForInput(date: Date): string {
  return date.toISOString().split('T')[1].substring(0, 5);
}
