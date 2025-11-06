#!/bin/bash
echo "🔍 Checking frontend build..."
if [ -d "frontend/build" ]; then
    echo "✅ Frontend build found at frontend/build"
    ls -la frontend/build | head -10
else
    echo "❌ Frontend build NOT found at frontend/build"
    echo "📂 Current directory contents:"
    ls -la
    echo "📂 Frontend directory contents:"
    ls -la frontend/
fi
echo "🚀 Starting backend server..."
cd backend
npm start
