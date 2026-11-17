import mongoose from 'mongoose';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

let connectionError: string | null = null;
let isConnecting = false;

mongoose.set('bufferCommands', false);

export async function connectToMongoAtlas(): Promise<boolean> {
  if (!env.MONGODB_URI || !env.MONGODB_URI.startsWith('mongodb')) {
    connectionError = 'MONGODB_URI is not configured. MongoDB Atlas connection is required for persistent operations.';
    console.warn(`[NOVARA DB] ${connectionError}`);
    return false;
  }

  isConnecting = true;
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 20,
    });
    connectionError = null;
    console.info('[NOVARA DB] Connected to MongoDB Atlas successfully.');
    return true;
  } catch (err) {
    connectionError = err instanceof Error ? err.message : 'Unknown MongoDB Atlas connection error';
    console.error('[NOVARA DB] MongoDB Atlas connection failed:', connectionError);
    return false;
  } finally {
    isConnecting = false;
  }
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}

export function getDatabaseStatus(): {
  connected: boolean;
  connecting: boolean;
  readyState: number;
  error: string | null;
} {
  return {
    connected: isDatabaseReady(),
    connecting: isConnecting,
    readyState: mongoose.connection.readyState,
    error: isDatabaseReady()
      ? null
      : isConnecting
        ? 'Connecting to MongoDB Atlas...'
        : connectionError || 'MongoDB Atlas is not connected.',
  };
}

export function requireDatabase(_req: Request, res: Response, next: NextFunction): void {
  if (!isDatabaseReady()) {
    res.status(503).json({
      ok: false,
      code: 'DATABASE_UNAVAILABLE',
      error: isConnecting
        ? 'Database connection is still initializing. Please retry in a moment.'
        : connectionError ||
          'MongoDB Atlas is not connected. Configure MONGODB_URI in environment variables to enable database persistence.',
    });
    return;
  }
  next();
}
