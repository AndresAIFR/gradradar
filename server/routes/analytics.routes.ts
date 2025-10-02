import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requireDeveloper } from "../middleware/permissions";
import { z } from "zod";

const router = Router();

// Track event (any authenticated user)
router.post("/events", requireAuth, async (req, res, next) => {
  try {
    const currentUser = (req as any).currentUser;
    
    const trackEventSchema = z.object({
      eventType: z.string(),
      eventCategory: z.string().optional(),
      eventAction: z.string().optional(),
      eventLabel: z.string().optional(),
      eventValue: z.number().optional(),
      metadata: z.record(z.any()).optional(),
      sessionId: z.string().optional(),
      path: z.string().optional(),
      referrer: z.string().optional(),
    });
    
    const eventData = trackEventSchema.parse(req.body);
    
    await storage.trackEvent({
      ...eventData,
      userId: currentUser.id,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    
    res.status(201).json({ message: "Event tracked successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid event data", errors: error.errors });
    }
    next(error);
  }
});

// Get events (developer only)
router.get("/events", requireAuth, requireDeveloper, async (req, res, next) => {
  try {
    const { startDate, endDate, userId, eventType, limit } = req.query;
    
    const events = await storage.getAnalyticsEvents({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      userId: userId as string,
      eventType: eventType as string,
      limit: limit ? parseInt(limit as string) : 100,
    });
    
    res.json(events);
  } catch (error) {
    next(error);
  }
});

// Get errors (developer only)
router.get("/errors", requireAuth, requireDeveloper, async (req, res, next) => {
  try {
    const { startDate, endDate, errorType, limit } = req.query;
    
    const errors = await storage.getAnalyticsErrors({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      errorType: errorType as string,
      limit: limit ? parseInt(limit as string) : 100,
    });
    
    res.json(errors);
  } catch (error) {
    next(error);
  }
});

// Get analytics summary (developer only)
router.get("/summary", requireAuth, requireDeveloper, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate and endDate are required" });
    }
    
    const summary = await storage.getAnalyticsSummary({
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    });
    
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// Track client-side errors (any authenticated user)
router.post("/errors", requireAuth, async (req, res, next) => {
  try {
    const currentUser = (req as any).currentUser;
    
    const trackErrorSchema = z.object({
      errorType: z.string(),
      errorMessage: z.string(),
      errorStack: z.string().optional(),
      path: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    });
    
    const errorData = trackErrorSchema.parse(req.body);
    
    await storage.trackError({
      ...errorData,
      userId: currentUser.id,
      userAgent: req.headers['user-agent'],
    });
    
    res.status(201).json({ message: "Error tracked successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid error data", errors: error.errors });
    }
    next(error);
  }
});

export default router;
