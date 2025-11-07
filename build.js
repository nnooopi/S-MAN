#!/usr/bin/env node

/**
 * Build script for Render deployment
 * Builds frontend and installs backend dependencies
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🏗️  Building S-MAN System for deployment...\n');

try {
  // Change to frontend directory
  console.log('📦 Step 1: Installing frontend dependencies...');
  process.chdir(path.join(__dirname, 'frontend'));
  execSync('npm install', { stdio: 'inherit' });
  
  // Build frontend
  console.log('\n🏗️  Step 2: Building frontend React app...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Change to backend directory
  console.log('\n📦 Step 3: Installing backend dependencies...');
  process.chdir(path.join(__dirname, '..', 'backend'));
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('\n✅ Build completed successfully!\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
