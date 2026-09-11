import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './database/index.js';
import apiRoutes from './routes/index.js';

// Resolve repo paths from this module's own location (works under tsx ESM and
// the bundled dist/server.cjs alike) so the server behaves identically no
// matter which directory it is started from: repo root, backend/, etc.
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

export async function createApp(isProduction = false) {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  await initDatabase();
  app.use('/api', apiRoutes);

  if (isProduction) {
    const distPath = path.join(repoRoot, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Vite is only needed in development; import it dynamically so the
    // production/serverless bundle doesn't require it.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: path.join(repoRoot, 'frontend'),
      configFile: path.join(repoRoot, 'frontend', 'vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  return app;
}
