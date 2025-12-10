// Simple static file server para servir el frontend
// Corre en puerto 3000

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const ROOT_DIR = path.join(__dirname);  // Raíz del proyecto

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Parse URL
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Default to index.html for root
  if (pathname === '/') {
    pathname = '/html/index.html';
  }

  // Get file path
  let filePath = path.join(ROOT_DIR, pathname);

  // Security: prevent directory traversal
  const realPath = path.resolve(filePath);
  if (!realPath.startsWith(path.resolve(ROOT_DIR))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Read file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // File not found
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + pathname);
      console.log(`❌ 404: ${pathname}`);
      return;
    }

    // Get mime type
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    // Add charset=utf-8 for text-based files
    if (mimeType.startsWith('text/') || mimeType === 'application/javascript') {
      mimeType += '; charset=utf-8';
    }

    // Send response
    res.writeHead(200, {
      'Content-Type': mimeType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(data);

    console.log(`✓ ${res.statusCode}: ${pathname}`);
  });
});

server.listen(PORT, () => {
  console.log(`\n📄 Frontend Server corriendo en http://localhost:${PORT}`);
  console.log(`📁 Sirviendo archivos desde: ${ROOT_DIR}\n`);
});

// Handle errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Puerto ${PORT} ya está en uso`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Cerrando servidor de frontend...');
  server.close(() => {
    console.log('✓ Servidor cerrado');
    process.exit(0);
  });
});
