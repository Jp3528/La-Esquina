const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const apiHandler = require('./api/index.js');

const PORT = Number(process.env.PORT || 3007);
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function staticFile(res, pathname) {
  let target;
  if (pathname === '/' || pathname === '/index.html') {
    target = path.join(ROOT, 'index.html');
  } else if (pathname === '/robots.txt') {
    target = path.join(ROOT, 'robots.txt');
  } else if (pathname.startsWith('/assets/')) {
    target = path.normalize(path.join(ROOT, pathname));
    const assetsRoot = path.join(ROOT, 'assets') + path.sep;
    if (!target.startsWith(assetsRoot)) return false;
  } else {
    return false;
  }

  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) return false;
  const ext = path.extname(target).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(target).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  const host = req.headers.host || `localhost:${PORT}`;
  const url = new URL(req.url, `http://${host}`);

  if (url.pathname.startsWith('/api')) {
    return apiHandler(req, res);
  }

  if (!staticFile(res, decodeURIComponent(url.pathname))) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Recurso no encontrado');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🍗 La Esquina lista en http://127.0.0.1:${PORT}`);
});
