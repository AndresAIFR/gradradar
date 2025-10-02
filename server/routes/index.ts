import express from "express";
import { concurrencyLimiter } from "../middleware/concurrencyLimiter";
import { registerGeoRoutes } from "./geo.routes";
import { registerCollegeRoutes } from "./colleges.routes";
import { registerAlumniRoutes } from "./alumni.routes";
import { registerInteractionsRoutes } from "./interactions.routes";
import { registerSettingsRoutes } from "./settings.routes";
import { authRoutes } from "./auth.routes";
import { aiRoutes } from "./ai.routes";
import usersRoutes from "./users.routes";
import analyticsRoutes from "./analytics.routes";

/**
 * Registers all API routes under /api prefix
 * This replaces the inline route definitions in routes.ts
 */
export function registerApiRoutes(app: express.Express) {
  const api = express.Router();

  // Apply concurrency limiting to all API routes (preserved behavior)
  api.use(concurrencyLimiter());

  // Register route modules
  registerGeoRoutes(api);
  registerCollegeRoutes(api);
  registerAlumniRoutes(api);
  registerInteractionsRoutes(api);
  registerSettingsRoutes(api);
  
  console.log('🔧 [ROUTES] Registering /api/users routes');
  // Mount before authRoutes to avoid /api/users collision
  api.use("/users", usersRoutes);
  
  api.use(authRoutes);
  api.use(aiRoutes);
  
  console.log('🔧 [ROUTES] Registering /api/analytics routes');
  api.use("/analytics", analyticsRoutes);

  app.use("/api", api);
  console.log('✅ [ROUTES] All API routes registered under /api');
}