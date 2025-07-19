const fs = require('fs');
const http = require('http');

// Minimal server to satisfy Render's port check
http.createServer((req, res) => {
  if (req.url === '/health') return res.end('OK');
  
  if (req.url === '/download') {
    // Serve the APK
    fs.readFile('app-debug.apk', (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('APK not ready. Check build logs.');
      }
      res.setHeader('Content-Disposition', 'attachment; filename=AdvayX.apk');
      res.end(data);
    });
  } else {
    res.end(`
      AdvayX Builder<br>
      <a href="/download">Download APK</a><br>
      Build logs: ${process.env.RENDER_EXTERNAL_URL}/logs
    `);
  }
}).listen(process.env.PORT || 3000);
