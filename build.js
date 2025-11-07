#!/usr/bin/env node

/**
 * Build script for Render deployment
 * Builds frontend and installs backend dependencies
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🏗️  Building S-MAN System for deployment...\n');
console.log('📂 Current working directory:', process.cwd());
console.log('📂 Script location (__dirname):', __dirname);

try {
  // Determine the root directory (where this script is located)
  const rootDir = __dirname;
  const frontendDir = path.join(rootDir, 'frontend');
  const backendDir = path.join(rootDir, 'backend');
  
  console.log('📂 Frontend dir:', frontendDir);
  console.log('📂 Backend dir:', backendDir);
  
  // Check if directories exist
  if (!fs.existsSync(frontendDir)) {
    console.error('❌ Frontend directory not found:', frontendDir);
    process.exit(1);
  }
  if (!fs.existsSync(backendDir)) {
    console.error('❌ Backend directory not found:', backendDir);
    process.exit(1);
  }

  // Change to frontend directory
  console.log('\n📦 Step 1: Installing frontend dependencies...');
  process.chdir(frontendDir);
  console.log('📂 Changed to:', process.cwd());
  execSync('npm install', { stdio: 'inherit' });
  
  // Build frontend
  console.log('\n🏗️  Step 2: Building frontend React app...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Verify build was created
  const buildDir = path.join(frontendDir, 'build');
  if (fs.existsSync(buildDir)) {
    console.log('✅ Frontend build created at:', buildDir);
  } else {
    console.error('❌ Frontend build folder was not created!');
    process.exit(1);
  }
  
  // Change to backend directory
  console.log('\n📦 Step 3: Installing backend dependencies...');
  process.chdir(backendDir);
  console.log('📂 Changed to:', process.cwd());
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('\n✅ Build completed successfully!\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
