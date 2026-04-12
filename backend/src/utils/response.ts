import { Response } from 'express';

/**
 * Standard success response.
 */
export function sendSuccess(res: Response, data: any, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data });
}

/**
 * Standard success response with pagination metadata.
 */
export function sendPaginated(res: Response, data: any[], total: number, limit: number, offset: number): void {
  res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  });
}

/**
 * Standard error response.
 */
export function sendError(res: Response, error: string, statusCode = 400): void {
  res.status(statusCode).json({ success: false, error });
}

/**
 * Parse pagination query params with defaults.
 */
export function parsePagination(query: { limit?: string; offset?: string }): { limit: number; offset: number } {
  const limit = Math.min(Math.max(parseInt(query.limit || '50', 10) || 50, 1), 100);
  const offset = Math.max(parseInt(query.offset || '0', 10) || 0, 0);
  return { limit, offset };
}
