import type { Response } from 'express';

export function sendSuccess<T extends Record<string, unknown>>(res: Response, payload: T, status = 200): void {
  res.status(status).json({
    ok: true,
    ...payload,
  });
}

export function sendCreated<T extends Record<string, unknown>>(res: Response, payload: T): void {
  sendSuccess(res, payload, 201);
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  error: string,
  details?: unknown,
): void {
  res.status(status).json({
    ok: false,
    code,
    error,
    ...(details !== undefined ? { details } : {}),
  });
}
