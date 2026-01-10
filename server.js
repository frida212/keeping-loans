const express = require('express');
const path = require('path');
const compression = require('compression');
const serveStatic = require('serve-static');

const app = express();
app.use(compression());
const root = path.resolve(__dirname);
app.use(serveStatic(root, { index: ['index.html'] }));

app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

const port = process.env.PORT || 8080;
app.listen(port, () => {});
