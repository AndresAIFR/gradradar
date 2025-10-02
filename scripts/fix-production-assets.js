#!/usr/bin/env node

// Fix production asset serving by copying built files to expected location
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';

console.log('🔧 Fixing production asset paths...');

try {
  // Ensure server/public directory exists
  if (!existsSync('server/public')) {
    mkdirSync('server/public', { recursive: true });
  }

  // Copy built assets from dist/public to server/public
  if (existsSync('dist/public')) {
    execSync('cp -r dist/public/* server/public/', { stdio: 'inherit' });
    console.log('✅ Production assets copied successfully');
  } else {
    console.log('⚠️  dist/public not found - run build first');
  }
} catch (error) {
  console.error('❌ Failed to fix production assets:', error.message);
  process.exit(1);
}