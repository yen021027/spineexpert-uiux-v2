const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../public');
const types = {html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',json:'application/json; charset=utf-8',jpg:'image/jpeg',svg:'image/svg+xml'};
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }
  let target = path.resolve(root, '.' + pathname);
  if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  if (target === root || fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
  fs.readFile(target, (error, body) => {
    if (error) { res.writeHead(404); return res.end('Not found'); }
    res.setHeader('Content-Type', types[path.extname(target).slice(1)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(body);
  });
}).listen(Number(process.env.PORT) || 4174, '127.0.0.1', () => console.log('Spine Expert V2: http://127.0.0.1:' + (process.env.PORT || 4174)));
