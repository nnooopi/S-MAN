#!/usr/bin/env node

/**
 * Build script for Render - runs from backend directory
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const timestamp = new Date().toISOString();
console.log(`\n[${timestamp}] 🚀 RENDER BUILD SCRIPT STARTING\n`);

try {
  // We're in backend/, so go up one level to root
  const rootDir = path.join(__dirname, '..');
  const frontendDir = path.join(rootDir, 'frontend');
  const backendDir = __dirname; // We're already here
  
  console.log('📂 Root dir:', rootDir);
  console.log('📂 Frontend dir:', frontendDir);
  console.log('📂 Backend dir:', backendDir);
  
  // Build frontend
  console.log('\n🏗️  Phase 1: Building frontend');
  process.chdir(frontendDir);
  console.log('📂 In:', process.cwd());
  execSync('npm install', { stdio: 'inherit' });
  execSync('npm run build', { stdio: 'inherit' });
  
  // Verify frontend build
  const buildDir = path.join(frontendDir, 'build');
  if (!fs.existsSync(buildDir)) {
    throw new Error('Frontend build directory not created!');
  }
  console.log('✅ Frontend build created at:', buildDir);
  
  // Install backend deps
  console.log('\n📦 Phase 2: Installing backend dependencies');
  process.chdir(backendDir);
  console.log('📂 In:', process.cwd());
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('\n✅ ALL BUILD PHASES COMPLETE\n');
  process.exit(0);
  
} catch (error) {
  console.error('\n❌ BUILD FAILED:', error.message);
  console.error(error.stack);
  process.exit(1);
}
