#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the server with correct Node.js flags for tsx
const serverPath = join(__dirname, 'index.ts');
const child = spawn('node', ['--import', 'tsx/esm', serverPath], {
  env: { ...process.env, NODE_ENV: 'development' },
  stdio: 'inherit',
  cwd: join(__dirname, '..')
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});