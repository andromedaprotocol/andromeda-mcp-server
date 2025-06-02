#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Get the directory of this script
const binDir = __dirname;
const distFile = path.join(binDir, '../dist/index.js');
const srcFile = path.join(binDir, '../src/index.ts');

// Check if compiled version exists, otherwise fall back to TypeScript
let targetFile;
let command;
let args;

if (fs.existsSync(distFile)) {
    // Use compiled JavaScript version
    targetFile = distFile;
    command = 'node';
    args = [targetFile, ...process.argv.slice(2)];
} else {
    // Fall back to TypeScript version for development
    console.warn('Compiled version not found, running TypeScript version...');
    targetFile = srcFile;
    command = 'npx';
    args = ['tsx', targetFile, ...process.argv.slice(2)];
}

// Run the appropriate version
const child = spawn(command, args, {
    stdio: 'inherit',
    cwd: path.dirname(binDir)
});

child.on('close', (code) => {
    process.exit(code);
});

child.on('error', (err) => {
    console.error(`Failed to start ${command}:`, err.message);
    console.error('Make sure the package is properly built with: npm run build');
    process.exit(1);
});
