/* Downloads wale kaam karne wale file ko deploy build me le aata hai,
   PWA hooks (manifest, install button, service worker registration) bachate hue.
   `node test/sync.js` — absolute paths, taaki kis directory se chalaya iska farak na pade. */
const fs = require('fs'), path = require('path');

const SRC = process.env.SRC || '/Users/apple/Downloads/Live_Explainer_Board.html';
const OUT = path.join(__dirname, '..', 'index.html');

const HEAD = `<title>Tech by Vansh — Explainer Studio</title>
<meta name="theme-color" content="#0A0E1A">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Explainer Studio">
<link rel="manifest" href="./manifest.webmanifest">
<link rel="apple-touch-icon" href="./icon-192.png">
<link rel="icon" href="./icon-192.png">`;

let src = fs.readFileSync(SRC, 'utf8');
const cur = fs.readFileSync(OUT, 'utf8');

if(!src.includes('manifest.webmanifest'))
  src = src.replace('<title>Tech by Vansh — Explainer Studio</title>', HEAD);

// install / update buttons
const HELP = '<button class="tbtn" data-pri="4" data-ico="?" id="helpBtn"';
if(!src.includes('id="installBtn"')){
  const a = cur.indexOf('<button class="tbtn blue"');
  const b = cur.indexOf(HELP);
  if(a < 0 || b < 0 || b < a) throw new Error('PWA buttons deploy copy me nahi mile');
  src = src.replace(HELP, cur.slice(a, b) + HELP);
}

// service worker registration + install prompt
const PWA_START = '/* ============================ PWA ============================';
const BOOT = '/* ----------------------------- BOOT ----------------------------- */';
if(!src.includes(PWA_START)){
  const a = cur.indexOf(PWA_START), b = cur.indexOf(BOOT);
  if(a < 0 || b < 0) throw new Error('PWA script deploy copy me nahi mila');
  src = src.replace(BOOT, cur.slice(a, b) + BOOT);
}

fs.writeFileSync(OUT, src);

const need = ['manifest.webmanifest', 'serviceWorker.register', 'id="installBtn"',
              'data-pri="3" data-ico="⬇︎" id="installBtn"'];
const missing = need.filter(n => !src.includes(n));
console.log(missing.length ? '✗ missing: ' + missing.join(', ') : '✓ synced with PWA hooks intact');
process.exit(missing.length ? 1 : 0);
