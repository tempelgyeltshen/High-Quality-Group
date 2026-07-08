import { createApp } from '../backend/app.js';

const appPromise = createApp(true);

export default async function handler(req: any, res: any) {
  const app = await appPromise;

  return new Promise<void>((resolve, reject) => {
    app(req, res, (err: unknown) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
