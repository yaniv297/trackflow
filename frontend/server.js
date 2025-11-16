const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const buildDir = path.join(__dirname, 'build');

// Simple static file server with SPA support
const server = http.createServer((req, res) => {
  let filePath = path.join(buildDir, req.url === '/' ? 'index.html' : req.url);
  
  // For SPA routes, serve index.html
  const ext = path.extname(filePath);
  if (!ext && !fs.existsSync(filePath)) {
    filePath = path.join(buildDir, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // If file doesn't exist, serve index.html for SPA routing
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(buildDir, 'index.html'), (err, data) => {
          if (err) {
            res.writeHead(404);
            res.end('Not found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
      return;
    }

    // Set content type based on file extension
    const ext = path.extname(filePath);
    const contentTypes = {
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
    const contentType = contentTypes[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});

