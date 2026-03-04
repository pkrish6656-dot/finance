import type { Express } from "express";
import { createApp } from "../server/createApp";

let cachedApp: Express | null = null;

async function getApp() {
  if (cachedApp) return cachedApp;
  const { app } = await createApp();
  cachedApp = app;
  return app;
}

export default async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}
