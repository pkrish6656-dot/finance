import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import { registerRoutes } from "./routes";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { serveStatic } from "./static";
import { setupVite } from "./vite";

export type AppBundle = { app: Express; server: Server };

export async function createApp(): Promise<AppBundle> {
  const app = express();
  const server = createServer(app);

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false }));

  await setupAuth(app);
  registerAuthRoutes(app);
  await registerRoutes(server, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else if (!process.env.VERCEL) {
    await setupVite(server, app);
  }

  return { app, server };
}
