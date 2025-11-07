#!/usr/bin/env node

/**
 * Start script for Render deployment
 * Starts the backend server
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting S-MAN backend server...\n');

try {
  process.chdir(path.join(__dirname, 'backend'));
  execSync('npm start', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Server failed to start:', error.message);
  process.exit(1);
}
