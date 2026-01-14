const express = require('express');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const serveStatic = require('serve-static');
const https = require('https');

const app = express();
app.use(compression());
const root = path.resolve(__dirname);
const distDir = path.join(root, 'desktop-client', 'dist');
if (fs.existsSync(distDir)) {
  app.use(serveStatic(distDir, { index: ['index.html'] }));
} else {
  app.use(serveStatic(root, { index: ['index.html'] }));
}

const cdnCache = new Map();
function proxyCdn(res, target, contentType) {
  if (cdnCache.has(target)) {
    const cached = cdnCache.get(target);
    res.setHeader('Content-Type', contentType);
    return res.status(200).send(cached);
  }
  https.get(target, (resp) => {
    if (resp.statusCode !== 200) {
      res.status(resp.statusCode || 500).send('cdn error');
      return;
    }
    const chunks = [];
    resp.on('data', (d) => chunks.push(d));
    resp.on('end', () => {
      const buf = Buffer.concat(chunks);
      cdnCache.set(target, buf);
      res.setHeader('Content-Type', contentType);
      res.status(200).send(buf);
    });
  }).on('error', () => {
    res.status(500).send('cdn fetch failed');
  });
}

app.get('/cdn/react.min.js', (req, res) => {
  proxyCdn(res, 'https://unpkg.com/react@18/umd/react.production.min.js', 'application/javascript');
});
app.get('/cdn/react-dom.min.js', (req, res) => {
  proxyCdn(res, 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js', 'application/javascript');
});
app.get('/cdn/papaparse.min.js', (req, res) => {
  proxyCdn(res, 'https://unpkg.com/papaparse@5.4.1/papaparse.min.js', 'application/javascript');
});
app.get('/cdn/tailwind.js', (req, res) => {
  proxyCdn(res, 'https://cdn.tailwindcss.com', 'application/javascript');
});

app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

app.get('/status', (req, res) => {
  const serving = fs.existsSync(distDir) ? 'dist' : 'root';
  res.status(200).json({
    serving,
    distExists: fs.existsSync(distDir),
    version: process.version
  });
});

app.get('/version', (req, res) => {
  res.status(200).json({ node: process.version });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  const serving = fs.existsSync(distDir) ? 'dist' : 'root';
  console.log(`KeepTrack server listening on ${port} (serving: ${serving})`);
});
