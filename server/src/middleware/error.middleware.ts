import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      ok: false,
      code: err.code,
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      ok: false,
      code: 'VALIDATION_ERROR',
      error: err.issues[0]?.message || 'Validation failed.',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  // Malformed JSON request payload from express.json()
  if (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as { status?: number; type?: string }).status === 400
  ) {
    res.status(400).json({
      ok: false,
      code: 'INVALID_JSON_BODY',
      error: 'Request body contains malformed JSON.',
    });
    return;
  }

  // Multer upload validation errors
  if (typeof err === 'object' && err !== null && 'name' in err && (err as { name?: string }).name === 'MulterError') {
    const multerErr = err as { message?: string; code?: string };
    res.status(400).json({
      ok: false,
      code: 'FILE_UPLOAD_ERROR',
      error: multerErr.message || 'Invalid file upload request.',
    });
    return;
  }

  // Mongoose duplicate key error (E11000)
  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: number }).code === 11000) {
    const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue || {};
    const field = Object.keys(keyValue)[0] || 'field';
    res.status(409).json({
      ok: false,
      code: 'DUPLICATE_KEY',
      error: `A record with this ${field} already exists.`,
      field,
    });
    return;
  }

  // Mongoose CastError (invalid ObjectId)
  if (typeof err === 'object' && err !== null && 'name' in err && (err as { name?: string }).name === 'CastError') {
    res.status(400).json({
      ok: false,
      code: 'INVALID_ID',
      error: 'Invalid resource identifier format.',
    });
    return;
  }

  const errName = typeof err === 'object' && err !== null && 'name' in err ? String((err as { name?: string }).name || '') : '';
  const message = err instanceof Error ? err.message : 'An unexpected server error occurred.';

  if (
    errName === 'MongooseError' ||
    errName === 'MongoNetworkError' ||
    errName === 'MongoServerSelectionError' ||
    message.includes('buffering timed out')
  ) {
    console.warn('[NOVARA DB] Database offline during request:', message);
    res.status(503).json({
      ok: false,
      code: 'DATABASE_UNAVAILABLE',
      error: 'Service temporarily unavailable (database offline).',
    });
    return;
  }

  console.error('[NOVARA API ERROR]', err);

  res.status(500).json({
    ok: false,
    code: 'INTERNAL_SERVER_ERROR',
    error: env.NODE_ENV === 'production' ? 'An internal server error occurred.' : message,
  });
}
