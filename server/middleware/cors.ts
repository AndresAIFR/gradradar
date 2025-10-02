import cors from "cors";

// Parse allowed origins from environment variable
const getAllowedOrigins = (): string[] => {
  const origins = process.env.APP_ORIGINS;
  
  if (!origins) {
    // Development fallback - restrict to localhost and Replit
    if (process.env.NODE_ENV === 'development') {
      return [
        'http://localhost:3000',
        'http://localhost:5000', 
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5000',
        // Replit development environment
        `https://${process.env.REPL_ID || 'unknown'}-00-${process.env.REPL_SLUG || 'unknown'}.${process.env.REPLIT_CLUSTER || 'riker'}.replit.dev`,
        // Generic Replit pattern fallback
        'https://491a98af-7fd3-4977-a34a-e4d21b82dfe2-00-1s9q8qz7mtjl5.riker.replit.dev'
      ];
    }
    
    // Production requires explicit origins
    console.warn('⚠️ APP_ORIGINS not set in production - CORS will be restrictive');
    return [];
  }
  
  return origins.split(',').map(origin => origin.trim());
};

const allowedOrigins = getAllowedOrigins();

export const corsConfig = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // If no allowlist configured in production, allow same-origin by default
    if (!allowedOrigins.length && process.env.NODE_ENV === 'production') {
      console.log(`ℹ️ CORS: Allowing same-origin request from ${origin}`);
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control'
  ],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200, // For legacy browser support
  maxAge: 86400 // Cache preflight for 24 hours
});

// Log CORS configuration on startup
console.log('🌐 CORS configured for origins:', allowedOrigins.length ? allowedOrigins : 'NONE (restrictive)');