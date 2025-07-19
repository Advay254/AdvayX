const fs = require('fs');
const http = require('http');

http.createServer((req, res) => {
  if (req.url === '/health') return res.end('OK'); // Required for Render
  
  if (req.url === '/download') {
    // Serve APK
    fs.readFile('app-debug.apk', (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('APK not found. Build may have failed.');
      }
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename=AdvayX.apk');
      res.end(data);
    });
  } else {
    res.end(`
      AdvayX Builder<br>
      <a href="/download">Download APK</a><br>
      <small>If download fails, check build logs at ${process.env.RENDER_EXTERNAL_URL}/logs</small>
    `);
  }
}).listen(process.env.PORT || 3000);
