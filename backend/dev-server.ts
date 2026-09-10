import { createApp } from './app.js';

async function startLocalServer() {
  const app = await createApp(process.env.NODE_ENV === 'production');
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`POS server running at http://localhost:${PORT}`);
  });
}

startLocalServer();
