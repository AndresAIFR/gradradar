import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";

// Store for tracking failed login attempts per account
const failedLoginAttempts = new Map<string, { count: number; lockUntil: number }>();
const forgotPasswordAttempts = new Map<string, { count: number; lastAttempt: number; dailyCount: number; dailyReset: number }>();

// Clean up expired entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  
  // Clean failed login attempts
  for (const [email, data] of Array.from(failedLoginAttempts.entries())) {
    if (now > data.lockUntil) {
      failedLoginAttempts.delete(email);
    }
  }
  
  // Clean forgot password attempts
  for (const [key, data] of Array.from(forgotPasswordAttempts.entries())) {
    if (now > data.dailyReset) {
      forgotPasswordAttempts.delete(key);
    }
  }
}, 15 * 60 * 1000);

// Generic API rate limiting
export const apiRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 300, // Increased to 300 requests per window per IP for development
  message: {
    error: "Too many requests, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoint rate limiting  
export const authRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 auth requests per window per IP
  message: {
    error: "Too many authentication attempts, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login attempt tracking and lockout
export const checkLoginLockout = (req: Request, res: Response, next: NextFunction) => {
  const email = req.body?.email?.toLowerCase();
  
  if (!email) {
    return next();
  }
  
  const now = Date.now();
  const attemptData = failedLoginAttempts.get(email);
  
  if (attemptData && now < attemptData.lockUntil) {
    const remainingTime = Math.ceil((attemptData.lockUntil - now) / (60 * 1000));
    return res.status(429).json({
      error: "Account temporarily locked due to multiple failed login attempts.",
      retryAfter: remainingTime
    });
  }
  
  next();
};

// Record failed login attempt
export const recordFailedLogin = (email: string) => {
  if (!email) return;
  
  email = email.toLowerCase();
  const now = Date.now();
  const attemptWindow = 15 * 60 * 1000; // 15 minutes window to track attempts
  const lockDuration = 10 * 60 * 1000; // 10 minutes lockout
  
  const current = failedLoginAttempts.get(email) || { count: 0, lockUntil: 0 };
  
  // Reset count if outside the attempt tracking window
  if (current.lockUntil > 0 && now > current.lockUntil + attemptWindow) {
    current.count = 0;
    current.lockUntil = 0;
  }
  
  current.count++;
  
  // Lock account after 10 failed attempts
  if (current.count >= 10) {
    current.lockUntil = now + lockDuration;
    console.log(`🔒 Account locked: ${email} (${current.count} failed attempts)`);
  }
  // Don't set lockUntil for attempts < 10 - just track the count
  
  failedLoginAttempts.set(email, current);
};

// Clear failed login attempts on successful login
export const clearFailedLogins = (email: string) => {
  if (email) {
    failedLoginAttempts.delete(email.toLowerCase());
  }
};

// Admin function to clear lockout for specific email
export const adminClearLockout = (email: string) => {
  if (email) {
    const cleared = failedLoginAttempts.delete(email.toLowerCase());
    console.log(`🔓 Admin cleared lockout for: ${email} (existed: ${cleared})`);
    return cleared;
  }
  return false;
};

// Forgot password rate limiting
export const forgotPasswordRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3, // 3 requests per minute per IP
  message: {
    error: "Too many password reset requests, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Check daily forgot password limit per account
export const checkForgotPasswordLimit = (req: Request, res: Response, next: NextFunction) => {
  const email = req.body?.email?.toLowerCase();
  const ip = req.ip || req.connection.remoteAddress;
  const key = `${email}:${ip}`;
  
  if (!email) {
    return next();
  }
  
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const current = forgotPasswordAttempts.get(key) || {
    count: 0,
    lastAttempt: 0,
    dailyCount: 0,
    dailyReset: now + dayMs
  };
  
  // Reset daily counter if needed
  if (now > current.dailyReset) {
    current.dailyCount = 0;
    current.dailyReset = now + dayMs;
  }
  
  if (current.dailyCount >= 5) {
    return res.status(429).json({
      error: "Daily password reset limit reached. Please try again tomorrow."
    });
  }
  
  current.dailyCount++;
  current.lastAttempt = now;
  forgotPasswordAttempts.set(key, current);
  
  next();
};

// Log authentication events
export const logAuthEvent = (event: string, email: string, ip: string, success: boolean = true) => {
  const timestamp = new Date().toISOString();
  const status = success ? "SUCCESS" : "FAILED";
  console.log(`🔐 AUTH [${timestamp}] ${status}: ${event} - ${email} from ${ip}`);
};