import type { RequestHandler } from "express";

/**
 * Wraps async route handlers to automatically catch and forward errors to Express error middleware
 */
export const asyncHandler = (fn: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);