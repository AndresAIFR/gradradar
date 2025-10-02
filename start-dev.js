#!/usr/bin/env node

import { spawn } from 'child_process';

// Start the development server with the correct Node.js import flag
const child = spawn('node', ['--import', 'tsx/esm', 'server/index.ts'], {
  env: { ...process.env, NODE_ENV: 'development' },
  stdio: 'inherit'
});

child.on('exit', (code) => {
  process.exit(code);
});