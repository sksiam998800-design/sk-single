import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { env } from './server/src/config/env';
import { connectToMongoAtlas } from './server/src/database/connection';
import { runDatabaseSeed } from './server/src/database/seed';
import { createExpressApp } from './server/src/app';

import { errorHandler } from './server/src/middleware/error.middleware';

async function bootstrap() {
  const app = createExpressApp();

  // Start MongoDB Atlas connection immediately in parallel with Vite/static initialization
  // so port binding is never delayed up to 8s by database selection timeouts.
  const dbInitPromise = connectToMongoAtlas().then(async (dbConnected) => {
    if (dbConnected) {
      await runDatabaseSeed().catch((err) => {
        console.error('[NOVARA SEED] Startup seed check error:', err);
      });
    }
    return dbConnected;
  });

  // Give fast connections up to 400ms to settle before first traffic without blocking startup
  await Promise.race([dbInitPromise, new Promise((resolve) => setTimeout(resolve, 400))]);

  const isProd = env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use((req, res, next) => {
      if (req.path === '/api' || req.path.startsWith('/api/')) {
        next();
        return;
      }
      vite.middlewares(req, res, next);
    });
  } else {
    const distPath = path.resolve(import.meta.dirname, 'dist');
    app.use(
      express.static(distPath, {
        index: false,
        maxAge: '7d',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        },
      }),
    );
    app.get('*', (req, res, next) => {
      if (req.path === '/api' || req.path.startsWith('/api/')) {
        next();
        return;
      }
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Production build not found. Run npm run build first.');
      }
    });
  }

  // Final safety net ensuring /api requests never emit Express HTML 404/500 pages
  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, code: 'API_NOT_FOUND', error: 'API endpoint not found.' });
  });
  app.use(errorHandler);

  app.listen(env.PORT, '0.0.0.0', () => {
    console.info(`[NOVARA SERVER] Listening on http://0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
  });
}

bootstrap().catch((err) => {
  console.error('[NOVARA SERVER] Fatal startup failure:', err);
  process.exit(1);
});
