/**
 * Centralized Error Handling System
 * 
 * This module provides custom error classes for consistent error handling
 * across the application. Use these instead of generic Error objects.
 * 
 * Usage:
 * ```typescript
 * import { NotFoundError, ValidationError } from '$lib/shared/errors';
 * 
 * if (!event) {
 *   throw new NotFoundError('Event');
 * }
 * 
 * if (!isValid) {
 *   throw new ValidationError('Invalid email format', { field: 'email' });
 * }
 * ```
 */

// ==================== BASE ERROR CLASS ====================

export class ApiError extends Error {
  public readonly name: string;
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    details?: unknown,
    isOperational: boolean = true
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details
    };
  }
}

// ==================== SPECIFIC ERROR CLASSES ====================

/**
 * 400 Bad Request
 * Use when the request is malformed or invalid
 */
export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad request', details?: unknown) {
    super('BAD_REQUEST', message, 400, details);
  }
}

/**
 * 401 Unauthorized
 * Use when authentication is required but not provided or invalid
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', details?: unknown) {
    super('UNAUTHORIZED', message, 401, details);
  }
}

/**
 * 403 Forbidden
 * Use when user is authenticated but doesn't have permission
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', details?: unknown) {
    super('FORBIDDEN', message, 403, details);
  }
}

/**
 * 404 Not Found
 * Use when a resource doesn't exist
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource', details?: unknown) {
    super('NOT_FOUND', `${resource} not found`, 404, details);
  }
}

/**
 * 409 Conflict
 * Use when there's a conflict with current state (e.g., duplicate entry)
 */
export class ConflictError extends ApiError {
  constructor(message: string, details?: unknown) {
    super('CONFLICT', message, 409, details);
  }
}

/**
 * 422 Unprocessable Entity
 * Use for validation errors
 */
export class ValidationError extends ApiError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 422, details);
  }
}

/**
 * 429 Too Many Requests
 * Use for rate limiting
 */
export class RateLimitError extends ApiError {
  constructor(message: string = 'Too many requests', details?: unknown) {
    super('RATE_LIMIT_EXCEEDED', message, 429, details);
  }
}

/**
 * 500 Internal Server Error
 * Use for unexpected server errors
 */
export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error', details?: unknown) {
    super('INTERNAL_SERVER_ERROR', message, 500, details, false);
  }
}

/**
 * 503 Service Unavailable
 * Use when external service is down
 */
export class ServiceUnavailableError extends ApiError {
  constructor(service: string, details?: unknown) {
    super('SERVICE_UNAVAILABLE', `${service} is currently unavailable`, 503, details);
  }
}

// ==================== DOMAIN-SPECIFIC ERRORS ====================

/**
 * Task-related errors
 */
export class TaskNotFoundError extends NotFoundError {
  constructor(taskId: string) {
    super('Task', { taskId });
  }
}

export class TaskVerificationError extends ApiError {
  constructor(message: string, details?: unknown) {
    super('TASK_VERIFICATION_FAILED', message, 400, details);
  }
}

export class TaskAlreadySubmittedError extends ConflictError {
  constructor(taskId: string) {
    super('Task already submitted', { taskId });
  }
}

/**
 * Event-related errors
 */
export class EventNotFoundError extends NotFoundError {
  constructor(eventId: string) {
    super('Event', { eventId });
  }
}

export class EventNotActiveError extends ApiError {
  constructor(eventId: string) {
    super('EVENT_NOT_ACTIVE', 'Event is not active', 400, { eventId });
  }
}

export class EventAlreadyEndedError extends ApiError {
  constructor(eventId: string) {
    super('EVENT_ENDED', 'Event has already ended', 400, { eventId });
  }
}

/**
 * User-related errors
 */
export class UserNotFoundError extends NotFoundError {
  constructor(userId: string) {
    super('User', { userId });
  }
}

export class UsernameAlreadyExistsError extends ConflictError {
  constructor(username: string) {
    super('Username already exists', { username });
  }
}

// ==================== ERROR HANDLER UTILITIES ====================

/**
 * Check if error is operational (expected) vs programming error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof ApiError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Convert any error to ApiError
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalServerError(error.message, { originalError: error.message });
  }

  return new InternalServerError('An unexpected error occurred', { error });
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: unknown) {
  const apiError = toApiError(error);
  
  return {
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      details: apiError.details
    }
  };
}

/**
 * Log error with context
 */
export function logError(error: Error, context?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  
  console.error('[Error]', {
    timestamp,
    name: error.name,
    message: error.message,
    stack: error.stack,
    context,
    ...(error instanceof ApiError ? {
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      isOperational: error.isOperational
    } : {})
  });
}

// ==================== SUPABASE ERROR MAPPER ====================

/**
 * Map Supabase error codes to our custom errors
 */
export function mapSupabaseError(error: any): ApiError {
  const code = error?.code;
  const message = error?.message || 'Database error';

  switch (code) {
    case 'PGRST116': // No rows returned
      return new NotFoundError('Resource');
    
    case '23505': // Unique violation
      return new ConflictError('Resource already exists');
    
    case '23503': // Foreign key violation
      return new BadRequestError('Invalid reference');
    
    case '42501': // Insufficient privilege
      return new ForbiddenError('Insufficient permissions');
    
    case 'PGRST301': // JWT expired
      return new UnauthorizedError('Session expired');
    
    default:
      return new InternalServerError(message, { code });
  }
}
