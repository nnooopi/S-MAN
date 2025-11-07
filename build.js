#!/usr/bin/env node

/**
 * Build script for Render deployment
 * Builds frontend and installs backend dependencies
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const timestamp = new Date().toISOString();
console.log(`\n[${ timestamp}] 🏗️  Building S-MAN System for deployment...\n`);
console.log('📂 Current working directory:', process.cwd());
console.log('📂 Script location (__dirname):', __dirname);

// Write build log
const logDir = path.join(__dirname, '.build-logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, `build-${Date.now()}.log`);
let logContent = `Build started at ${timestamp}\n`;
logContent += `CWD: ${process.cwd()}\n`;
logContent += `__dirname: ${__dirname}\n`;

try {
  // Determine the root directory (where this script is located)
  const rootDir = __dirname;
  const frontendDir = path.join(rootDir, 'frontend');
  const backendDir = path.join(rootDir, 'backend');
  
  logContent += `Frontend dir: ${frontendDir}\n`;
  logContent += `Backend dir: ${backendDir}\n`;
  
  console.log('📂 Frontend dir:', frontendDir);
  console.log('📂 Backend dir:', backendDir);
  
  // Check if directories exist
  if (!fs.existsSync(frontendDir)) {
    const msg = `❌ Frontend directory not found: ${frontendDir}`;
    console.error(msg);
    logContent += `ERROR: ${msg}\n`;
    fs.writeFileSync(logFile, logContent);
    process.exit(1);
  }
  if (!fs.existsSync(backendDir)) {
    const msg = `❌ Backend directory not found: ${backendDir}`;
    console.error(msg);
    logContent += `ERROR: ${msg}\n`;
    fs.writeFileSync(logFile, logContent);
    process.exit(1);
  }

  // Change to frontend directory
  console.log('\n📦 Step 1: Installing frontend dependencies...');
  logContent += `\nStep 1: Installing frontend dependencies\n`;
  process.chdir(frontendDir);
  console.log('📂 Changed to:', process.cwd());
  logContent += `Changed to: ${process.cwd()}\n`;
  execSync('npm install', { stdio: 'inherit' });
  logContent += `npm install completed\n`;
  
  // Build frontend
  console.log('\n🏗️  Step 2: Building frontend React app...');
  logContent += `\nStep 2: Building frontend React app\n`;
  execSync('npm run build', { stdio: 'inherit' });
  logContent += `npm run build completed\n`;
  
  // Verify build was created
  const buildDir = path.join(frontendDir, 'build');
  if (fs.existsSync(buildDir)) {
    const msg = `✅ Frontend build created at: ${buildDir}`;
    console.log(msg);
    logContent += `${msg}\n`;
    const files = fs.readdirSync(buildDir);
    console.log(`   Files in build: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
    logContent += `   Files in build: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}\n`;
  } else {
    const msg = `❌ Frontend build folder was not created!`;
    console.error(msg);
    logContent += `ERROR: ${msg}\n`;
    fs.writeFileSync(logFile, logContent);
    process.exit(1);
  }
  
  // Change to backend directory
  console.log('\n📦 Step 3: Installing backend dependencies...');
  logContent += `\nStep 3: Installing backend dependencies\n`;
  process.chdir(backendDir);
  console.log('📂 Changed to:', process.cwd());
  logContent += `Changed to: ${process.cwd()}\n`;
  execSync('npm install', { stdio: 'inherit' });
  logContent += `npm install completed\n`;
  
  logContent += `\nBuild completed successfully at ${new Date().toISOString()}\n`;
  console.log('\n✅ Build completed successfully!\n');
  fs.writeFileSync(logFile, logContent);
  process.exit(0);
} catch (error) {
  logContent += `\nERROR: ${error.message}\n`;
  logContent += `${error.stack}\n`;
  console.error('\n❌ Build failed:', error.message);
  fs.writeFileSync(logFile, logContent);
  process.exit(1);
}
