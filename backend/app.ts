import express from 'express';
import path from 'path';
import { initDatabase } from './database/index.js';
import apiRoutes from './routes/index.js';

export async function createApp(isProduction = false) {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  await initDatabase();
  app.use('/api', apiRoutes);

  if (isProduction) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Vite is only needed in development; import it dynamically so the
    // production/serverless bundle doesn't require it.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: path.resolve(process.cwd(), 'frontend'),
      configFile: path.resolve(process.cwd(), 'frontend/vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  return app;
}
