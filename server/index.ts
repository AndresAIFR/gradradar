import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./initDb";
import { corsConfig } from "./middleware/cors";
import { apiRateLimit } from "./middleware/rateLimiting";

const app = express();
app.set('trust proxy', 1); // Enable trust proxy for secure cookies behind reverse proxy

// Security middleware
app.use(corsConfig);
app.use('/api', apiRateLimit);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Note: Removed insecure static file serving of uploads
// Files are now served through authenticated endpoints in routes.ts

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // LEVEL 1: Entry point logging for /users requests
  if (path.includes('/users')) {
    console.log('🚪 [ENTRY] Request entering server:', {
      method: req.method,
      path: req.path,
      url: req.url,
      query: req.query,
      hasSession: !!(req as any).session,
      hasUser: !!(req as any).user,
    });
  }

  // Log incoming requests
  if (path.startsWith("/api") || path === "/") {
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Add error handling for response
  const originalSend = res.send;
  res.send = function(body) {
    return originalSend.call(this, body);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  res.on("error", (err) => {
  });

  next();
});

(async () => {
  try {
    // Fail fast if APP_URL is missing in production
    if (process.env.NODE_ENV === 'production' && !process.env.APP_URL) {
      throw new Error('APP_URL env var is required in production');
    }

    await initializeDatabase();
    
    const server = await registerRoutes(app);

    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      
      // Don't send error response if headers already sent
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    process.exit(1);
  }
})();
