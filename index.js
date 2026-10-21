import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.cwd();
const DIST = existsSync(join(ROOT, 'dist')) ? join(ROOT, 'dist') : ROOT;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

// Vercel Serverless Function handler
export default function handler(req, res) {
  let urlPath = req.url ? req.url.split('?')[0] : '/';
  if (urlPath === '/' || !urlPath) urlPath = '/index.html';

  const candidates = [
    join(DIST, urlPath),
    join(ROOT, urlPath),
    join(DIST, 'index.html'),
    join(ROOT, 'index.html')
  ];

  for (const filePath of candidates) {
    if (existsSync(filePath)) {
      try {
        const ext = extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const content = readFileSync(filePath);
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600'
        });
        res.end(content);
        return;
      } catch {}
    }
  }

  // Fallback to index.html
  const fallbackHtml = existsSync(join(DIST, 'index.html'))
    ? readFileSync(join(DIST, 'index.html'), 'utf8')
    : readFileSync(join(ROOT, 'index.html'), 'utf8');

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(fallbackHtml);
}

// Standalone local execution: node index.js
if (process.argv[1] && (process.argv[1].endsWith('index.js') || process.argv[1].endsWith('index.mjs'))) {
  const server = createServer(handler);
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Hitung Sehat berjalan di: http://localhost:${PORT}`);
  });
}
