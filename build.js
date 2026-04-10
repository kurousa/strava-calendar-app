import { build } from 'esbuild';
import { GasPlugin } from 'esbuild-gas-plugin';
import fs from 'fs';
import path from 'path';

const distDir = './dist';

// Ensure dist directory exists
if (!fs.existsSync(distDir)){
    fs.mkdirSync(distDir);
}

// Copy static files to dist
const filesToCopy = ['appsscript.json', 'index.html'];
filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(distDir, file));
        console.log(`Copied ${file} to dist/`);
    }
});

build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/Code.js',
  format: 'iife',
  target: 'es2019', // GAS V8 engine supports roughly ES2019
  plugins: [GasPlugin],
}).then(() => {
  console.log('Build complete!');
}).catch(() => process.exit(1));
