#!/usr/bin/env node
const { execSync } = require('child_process');

console.log('🧪 Running pre-deployment tests...');

try {
    // Clean and build
    console.log('Building project...');
    execSync('npm run clean', { stdio: 'inherit' });
    execSync('npm run build', { stdio: 'inherit' });
    
    // Verify build
    console.log('Verifying build...');
    execSync('node verify-build.js', { stdio: 'inherit' });
    
    console.log('✅ Pre-deployment tests passed!');
    console.log('🚀 Ready for Render deployment!');
} catch (error) {
    console.error('❌ Pre-deployment tests failed:', error.message);
    process.exit(1);
}
