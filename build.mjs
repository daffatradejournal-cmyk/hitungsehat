import { mkdirSync, copyFileSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');

console.log('Building Hitung Sehat for production...');

// Ensure clean dist directory
mkdirSync(DIST, { recursive: true });
mkdirSync(join(DIST, 'styles'), { recursive: true });
mkdirSync(join(DIST, 'scripts'), { recursive: true });

// Copy styles
for (const file of readdirSync(join(ROOT, 'styles'))) {
  copyFileSync(join(ROOT, 'styles', file), join(DIST, 'styles', file));
}
console.log('✓ Copied styles');

// Copy scripts
for (const file of readdirSync(join(ROOT, 'scripts'))) {
  copyFileSync(join(ROOT, 'scripts', file), join(DIST, 'scripts', file));
}
console.log('✓ Copied scripts');

// Copy manifest
if (existsSync(join(ROOT, 'manifest.json'))) {
  copyFileSync(join(ROOT, 'manifest.json'), join(DIST, 'manifest.json'));
  console.log('✓ Copied manifest.json');
}

// Process index.html: inline the CSS so there is ZERO chance of FOUC / 404
const appCss = readFileSync(join(ROOT, 'styles', 'app.css'), 'utf8');
const compCss = readFileSync(join(ROOT, 'styles', 'components.css'), 'utf8');
let indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');

// Replace external CSS links with inlined style tags + keep links for browser caching
const inlinedStyles = `
  <style id="inlined-app-css">\n${appCss}\n</style>
  <style id="inlined-components-css">\n${compCss}\n</style>
  <link rel="stylesheet" href="/styles/app.css">
  <link rel="stylesheet" href="/styles/components.css">
`;

indexHtml = indexHtml.replace(
  /<link rel="stylesheet" href="\/styles\/app\.css">\s*<link rel="stylesheet" href="\/styles\/components\.css">/,
  inlinedStyles.trim()
);

writeFileSync(join(DIST, 'index.html'), indexHtml, 'utf8');
console.log('✓ Built dist/index.html with inlined styles and scripts');
console.log('Build completed successfully.');
