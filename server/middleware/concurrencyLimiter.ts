import type { RequestHandler } from "express";

/**
 * Middleware to limit concurrent requests per user to prevent API abuse
 * Extracted from routes.ts to be reusable across route modules
 */
export function concurrencyLimiter(): RequestHandler {
  const activeConnections = new Map<string, number>();
  const pendingRequests = new Map<string, Promise<any>>();

  return (req, res, next) => {
    const userId = (req.user as any)?.email || 'anonymous';
    
    // Only apply limiting to API routes when mounted under /api
    if (!req.originalUrl.startsWith('/api/')) {
      return next();
    }

    // Request deduplication - if same user making identical request, reuse the pending promise
    const requestKey = `${userId}:${req.method}:${req.originalUrl}`;
    if (pendingRequests.has(requestKey)) {
      return pendingRequests.get(requestKey);
    }

    // Concurrency limiting
    const currentConnections = activeConnections.get(userId) || 0;
    const limit = userId === 'anonymous' ? 3 : 8;
    
    if (currentConnections >= limit) {
      return res.status(429).json({ 
        message: "Too many concurrent requests, please wait" 
      });
    }

    // Track this connection
    activeConnections.set(userId, currentConnections + 1);
    
    // Create promise for request deduplication
    const requestPromise = new Promise((resolve, reject) => {
      const originalSend = res.send;
      const originalJson = res.json;
      
      // Override response methods to resolve the promise
      res.send = function(body) {
        resolve(body);
        return originalSend.call(this, body);
      };
      
      res.json = function(body) {
        resolve(body);
        return originalJson.call(this, body);
      };
      
      // Handle request completion
      res.on('finish', () => {
        const newCount = (activeConnections.get(userId) || 1) - 1;
        if (newCount <= 0) {
          activeConnections.delete(userId);
        } else {
          activeConnections.set(userId, newCount);
        }
        pendingRequests.delete(requestKey);
        resolve(undefined);
      });

      // Handle errors
      res.on('error', (error) => {
        const newCount = (activeConnections.get(userId) || 1) - 1;
        if (newCount <= 0) {
          activeConnections.delete(userId);
        } else {
          activeConnections.set(userId, newCount);
        }
        pendingRequests.delete(requestKey);
        reject(error);
      });

      next();
    });

    pendingRequests.set(requestKey, requestPromise);
    return requestPromise;
  };
}