const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Cleaning TypeScript cache and restarting server...');

// Clean any potential cache
const cacheDirs = [
  path.join(__dirname, 'node_modules/.cache'),
  path.join(__dirname, '.tscache'),
  path.join(__dirname, 'dist')
];

cacheDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`Removing cache directory: ${dir}`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

console.log('Starting server with clean compilation...');
const serverProcess = exec('PORT=8080 npx ts-node src/bin/www.ts', {
  cwd: __dirname,
  env: { ...process.env, NODE_ENV: 'development' }
});

serverProcess.stdout.on('data', (data) => {
  console.log(data.toString());
});

serverProcess.stderr.on('data', (data) => {
  console.error(data.toString());
});

serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});