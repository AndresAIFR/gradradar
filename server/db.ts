import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a single connection instance with retry logic
let dbInstance: ReturnType<typeof drizzle> | null = null;

function createConnection() {
  if (dbInstance) {
    return dbInstance;
  }

  const sql = neon(process.env.DATABASE_URL!);
  dbInstance = drizzle(sql, { 
    schema,
    logger: false
  });
  
  return dbInstance;
}

// Add connection retry wrapper
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a connection limit error
      if (error.message?.includes('Too many database connection attempts') || 
          error.message?.includes('connection limit')) {
        
        // Wait with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Reset connection instance to force reconnection
        dbInstance = null;
        continue;
      }
      
      // If it's not a connection error, don't retry
      throw error;
    }
  }
  
  throw lastError!;
}

export const db = createConnection();

// Export retry wrapper for critical operations
export { withRetry };