import { isDatabaseReady } from '../database/connection';
import { SystemLogModel } from '../modules/support/support.model';

export type LogLevel = 'info' | 'warn' | 'error';

export async function logSystemEvent(params: {
  level?: LogLevel;
  source: string;
  message: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const level = params.level || 'info';
  const prefix = `[NOVARA ${params.source.toUpperCase()}]`;
  if (level === 'error') {
    console.error(prefix, params.message);
  } else if (level === 'warn') {
    console.warn(prefix, params.message);
  } else {
    console.info(prefix, params.message);
  }

  if (isDatabaseReady()) {
    try {
      await SystemLogModel.create({
        level,
        source: params.source,
        message: params.message,
        meta: params.meta,
      });
    } catch {
      // Do not throw from logger
    }
  }
}
