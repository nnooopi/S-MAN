#!/usr/bin/env node

/**
 * Start script for Render deployment
 * Starts the backend server
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting S-MAN backend server...\n');

try {
  const rootDir = __dirname;
  const backendDir = path.join(rootDir, 'backend');
  const frontendBuildDir = path.join(rootDir, 'frontend', 'build');
  
  console.log('📂 Root directory:', rootDir);
  console.log('📂 Backend directory:', backendDir);
  console.log('📂 Frontend build directory:', frontendBuildDir);
  
  // Check if backend exists
  if (!fs.existsSync(backendDir)) {
    console.error('❌ Backend directory not found:', backendDir);
    process.exit(1);
  }
  
  // Check if frontend build exists
  if (!fs.existsSync(frontendBuildDir)) {
    console.warn('⚠️  Frontend build not found at:', frontendBuildDir);
    console.warn('⚠️  Frontend will not be served, API-only mode');
  } else {
    console.log('✅ Frontend build found at:', frontendBuildDir);
  }
  
  process.chdir(backendDir);
  console.log('📂 Changed to:', process.cwd());
  console.log('🚀 Starting server...\n');
  
  execSync('npm start', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Server failed to start:', error.message);
  process.exit(1);
}
