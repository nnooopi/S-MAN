#!/usr/bin/env node

/**
 * Complete build and prepare script for Render
 * This is called as the build command, no shell operators needed
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const timestamp = new Date().toISOString();
console.log(`\n[${timestamp}] 🚀 RENDER BUILD SCRIPT STARTING\n`);

try {
  console.log('📦 Phase 1: npm install (root dependencies)');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('\n🏗️  Phase 2: Building frontend');
  const rootDir = __dirname;
  const frontendDir = path.join(rootDir, 'frontend');
  const backendDir = path.join(rootDir, 'backend');
  
  // Build frontend
  process.chdir(frontendDir);
  console.log('📂 In:', process.cwd());
  execSync('npm install', { stdio: 'inherit' });
  execSync('npm run build', { stdio: 'inherit' });
  
  // Verify frontend build
  const buildDir = path.join(frontendDir, 'build');
  if (!fs.existsSync(buildDir)) {
    throw new Error('Frontend build directory not created!');
  }
  console.log('✅ Frontend build created');
  
  // Install backend deps
  console.log('\n📦 Phase 3: Installing backend dependencies');
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
