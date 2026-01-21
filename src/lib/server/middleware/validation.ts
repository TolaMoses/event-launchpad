/**
 * Validation Middleware
 * 
 * Use Zod schemas to validate all API inputs
 * 
 * Usage:
 * ```ts
 * const validated = await validateBody(request, mySchema);
 * ```
 */

import { z } from 'zod';
import type { RequestHandler } from '@sveltejs/kit';
import { ValidationError } from '$lib/shared/errors';

/**
 * Validate request body against Zod schema
 * 
 * @param request - Request object
 * @param schema - Zod schema
 * @returns Validated and typed data
 * @throws ValidationError if validation fails
 */
export async function validateBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        'Invalid request data',
        { errors: error.errors }
      );
    }
    if (error instanceof SyntaxError) {
      throw new ValidationError('Invalid JSON payload');
    }
    throw error;
  }
}

/**
 * Validate query parameters against Zod schema
 */
export function validateQuery<T extends z.ZodType>(
  url: URL,
  schema: T
): z.infer<T> {
  try {
    const params = Object.fromEntries(url.searchParams.entries());
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        'Invalid query parameters',
        { errors: error.errors }
      );
    }
    throw error;
  }
}

/**
 * Create validation middleware
 * 
 * @param schema - Zod schema to validate against
 * @param handler - Request handler that receives validated data
 */
export function withValidation<T extends z.ZodType>(
  schema: T,
  handler: (validated: z.infer<T>, event: any) => Promise<Response>
): RequestHandler {
  return async (event) => {
    const validated = await validateBody(event.request, schema);
    return await handler(validated, event);
  };
}

/**
 * Validate request params (path parameters)
 */
export function validateParams<T extends z.ZodType>(
  params: Record<string, string>,
  schema: T
): z.infer<T> {
  try {
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        'Invalid path parameters',
        { errors: error.errors }
      );
    }
    throw error;
  }
}
