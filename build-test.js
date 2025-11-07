#!/usr/bin/env node
// This file just creates a marker file to prove render-build.js was executed
const fs = require('fs');
const path = require('path');

const markerFile = path.join(__dirname, '.render-build-executed');
fs.writeFileSync(markerFile, new Date().toISOString());
console.log('✅ Marker file created at:', markerFile);

// Now call the real build
require('./render-build.js');
