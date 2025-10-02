import bcrypt from "bcrypt";
import crypto from "crypto";
import { Strategy as LocalStrategy } from "passport-local";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { sendEmail } from "./emailService";
import passport from "passport";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { randomBytes } from "crypto";

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY_HOURS = 24;

// Session configuration
export function setupSession(app: Express) {
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: 7 * 24 * 60 * 60, // 1 week in seconds
    tableName: "sessions",
  });

  // Detect production environment more reliably
  // Production is when APP_URL is HTTPS OR when NODE_ENV is 'production'
  const isProduction = (process.env.APP_URL?.startsWith('https://')) || (process.env.NODE_ENV === 'production');
  
  console.log('🔧 Session configuration:', {
    NODE_ENV: process.env.NODE_ENV,
    APP_URL: process.env.APP_URL,
    isProduction,
    cookieSecure: isProduction
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key-for-dev',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction, // Use HTTPS detection instead of just NODE_ENV
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
    name: 'connect.sid',
    genid: () => {
      return randomBytes(16).toString('hex');
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());
}

// Configure passport local strategy
export function setupEmailAuth() {
  // Passport serialization for sessions
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user || false);
    } catch (error) {
      done(error);
    }
  });
  passport.use('local', new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        
        if (!user || !user.hashedPassword) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Check email verification for email auth users
        if (!user.emailVerified && user.authMethod === 'email') {
          return done(null, false, { message: 'Please verify your email before logging in' });
        }

        const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
        
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));
}

// Helper functions
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function getTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + TOKEN_EXPIRY_HOURS);
  return expiry;
}

// Safe URL building helpers
function baseUrl(): string {
  const raw = process.env.APP_URL || 'http://localhost:5000';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function makeUrl(path: string, token: string): string {
  const u = new URL(path, baseUrl());
  u.searchParams.set('token', token);
  return u.toString();
}

export async function sendVerificationEmail(user: any, token: string): Promise<void> {
  const verificationUrl = makeUrl('/verify-email', token);
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Verify Your Email Address</h2>
      <p>Hello ${user.firstName || 'there'},</p>
      <p>Please click the link below to verify your email address and activate your GradRadar account:</p>
      <p>
        <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Verify Email Address
        </a>
      </p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p>Best regards,<br>GradRadar Team</p>
    </div>
  `;

  await sendEmail({
    to: user.email,
    from: user.fromEmail || 'noreply@tutortracker.com',
    subject: 'Verify Your Email Address - GradRadar',
    html: emailHtml,
  });
}

export async function sendPasswordResetEmail(user: any, token: string): Promise<void> {
  const resetUrl = makeUrl('/reset-password', token);
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Reset Your Password</h2>
      <p>Hello ${user.firstName || 'there'},</p>
      <p>You requested to reset your password for your GradRadar account. Click the link below to set a new password:</p>
      <p>
        <a href="${resetUrl}" style="background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Reset Password
        </a>
      </p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      <p>Best regards,<br>GradRadar Team</p>
    </div>
  `;

  await sendEmail({
    to: user.email,
    from: user.fromEmail || 'noreply@tutortracker.com',
    subject: 'Reset Your Password - GradRadar',
    html: emailHtml,
  });
}

export async function sendInvitationEmail(email: string, token: string, inviterName: string): Promise<void> {
  const acceptUrl = makeUrl('/accept-invitation', token);
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">You're Invited to Join GradRadar</h2>
      <p>Hello,</p>
      <p>${inviterName} has invited you to join GradRadar, a comprehensive alumni tracking platform.</p>
      <p>Click the link below to create your account:</p>
      <p>
        <a href="${acceptUrl}" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Accept Invitation & Create Account
        </a>
      </p>
      <p>This invitation will expire in 7 days.</p>
      <p>If you have any questions, please contact your administrator.</p>
      <p>Best regards,<br>GradRadar Team</p>
    </div>
  `;

  await sendEmail({
    to: email,
    from: 'noreply@gradradar.com',
    subject: 'You\'re Invited to Join GradRadar',
    html: emailHtml,
  });
}

// Simple authentication middleware (replaces complex Replit auth)
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};