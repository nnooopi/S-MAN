#!/bin/bash
set -e

echo "� Current directory:"
pwd
echo "📂 Directory contents:"
ls -la

echo "�📦 Installing frontend dependencies..."
cd frontend
npm install

echo "🏗️ Building frontend..."
npm run build

echo "✅ Frontend build complete!"
echo "� Build output:"
ls -la build/ | head -20

echo "�📦 Installing backend dependencies..."
cd ../backend
npm install

echo "✅ All build steps complete!"
