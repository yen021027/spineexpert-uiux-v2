const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../public'), file = path.join(root, 'index.html');
const html = fs.readFileSync(file, 'utf8').replace(/((?:src|href)=")(app\.js|styles\.css)(?:\?[^\"]*)?(\")/g, (_, prefix, asset, suffix) => `${prefix}${asset}?v=${crypto.createHash('sha256').update(fs.readFileSync(path.join(root, asset))).digest('hex').slice(0, 12)}${suffix}`);
fs.writeFileSync(file, html);
console.log('Versioned CSS and JS.');
