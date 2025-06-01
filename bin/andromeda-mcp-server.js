#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');

// Get the directory of this script
const binDir = __dirname;
const srcFile = path.join(binDir, '../src/index.ts');

// Run tsx with our TypeScript file
const child = spawn('npx', ['tsx', srcFile, ...process.argv.slice(2)], {
    stdio: 'inherit',
    cwd: path.dirname(binDir)
});

child.on('close', (code) => {
    process.exit(code);
});

child.on('error', (err) => {
    console.error('Failed to start tsx:', err.message);
    process.exit(1);
});
