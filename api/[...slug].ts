import { createApp } from '../backend/app.js';

let cachedApp: any = null;

async function getApp() {
  if (!cachedApp) {
    cachedApp = await createApp(true);
  }
  return cachedApp;
}

export default async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}
