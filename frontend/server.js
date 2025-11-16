const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const buildDir = path.join(__dirname, 'build');

// Simple static file server with SPA support
const server = http.createServer((req, res) => {
  // Log all requests for debugging
  console.log(`${req.method} ${req.url}`);
  
  // Healthcheck endpoint
  if (req.url === '/health' || req.url === '/healthcheck') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  
  try {
    // Parse URL and remove query string
    const urlPath = req.url.split('?')[0];
    let filePath = path.join(buildDir, urlPath === '/' ? 'index.html' : urlPath);
    
    // Security: prevent directory traversal
    if (!filePath.startsWith(buildDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // Check if file exists and has extension
    const ext = path.extname(filePath);
    const fileExists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();

    // If no extension or file doesn't exist, serve index.html for SPA routing
    if (!ext || !fileExists) {
      filePath = path.join(buildDir, 'index.html');
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        // If file doesn't exist, serve index.html for SPA routing
        if (err.code === 'ENOENT') {
          const indexPath = path.join(buildDir, 'index.html');
          fs.readFile(indexPath, (err, data) => {
            if (err) {
              console.error('Error serving index.html:', err);
              res.writeHead(404);
              res.end('Not found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(data);
            }
          });
        } else {
          console.error('Error reading file:', err);
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
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.eot': 'application/vnd.ms-fontobject'
      };
      const contentType = contentTypes[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500);
    res.end('Server error');
  }
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
  console.log(`Serving files from: ${buildDir}`);
});

