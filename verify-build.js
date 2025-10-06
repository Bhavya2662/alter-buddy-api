#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying build output...');

// Check if build directory exists
if (!fs.existsSync('./build')) {
    console.error('❌ Build directory not found!');
    process.exit(1);
}

// Check if main entry point exists
if (!fs.existsSync('./build/bin/www.js')) {
    console.error('❌ Main entry point (build/bin/www.js) not found!');
    process.exit(1);
}

// Check if API routes are compiled
if (!fs.existsSync('./build/api/1.0/index.js')) {
    console.error('❌ API routes not compiled!');
    process.exit(1);
}

// Check if authentication controller is compiled
if (!fs.existsSync('./build/api/1.0/controller/authentication.controller.js')) {
    console.error('❌ Authentication controller not compiled!');
    process.exit(1);
}

console.log('✅ Build verification passed!');
console.log('✅ All required files are present');
