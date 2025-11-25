// src/lib/server/session.ts
export const SESSION_NAME = 'sid';

export function parseSession(raw: string | undefined) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

