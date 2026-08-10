/* Downloads wale kaam karne wale file ko deploy build me le aata hai, PWA hooks
   (manifest, install/update buttons, service worker) jodte hue.
   `node test/sync.js` — absolute paths, taaki kis directory se chalaya iska farak na pade.

   NOTE: pehle ye PWA buttons ko deploy copy me se `class="tbtn blue"` dhoondh kar
   kaat-ta tha. Jis din Gallery ko blue banaya, wo match pehle aa gaya aur script
   ne poora top bar hi kaat kar dobara chipka diya — har run pe. 27 duplicate ban
   chuke the aur live bhi chale gaye the. Isliye ab buttons yahin likhe hain,
   kisi khoj ke bharose nahi. */
const fs = require('fs'), path = require('path');

const SRC = process.env.SRC || '/Users/apple/Downloads/Live_Explainer_Board.html';
const OUT = path.join(__dirname, '..', 'index.html');

const HEAD_EXTRA = `
<meta name="theme-color" content="#0A0E1A">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Explainer Studio">
<link rel="manifest" href="./manifest.webmanifest">
<link rel="apple-touch-icon" href="./icon-192.png">
<link rel="icon" href="./icon-192.png">`;

const PWA_BUTTONS =
`<button class="tbtn blue" data-pri="3" data-ico="⬇︎" id="installBtn" title="Install — app ki tarah lag jayega, offline bhi chalega" style="display:none">⬇︎ Install</button>
  <button class="tbtn" data-pri="2" data-ico="↻" id="updBtn" title="Naya version aa gaya — dabao to lag jayega" style="display:none">↻ Update</button>
  `;

const TITLE = '<title>Tech by Vansh — Explainer Studio</title>';
const HELP  = '<button class="tbtn" data-pri="4" data-ico="?" id="helpBtn"';
const PWA_START = '/* ============================ PWA ============================';
const BOOT      = '/* ----------------------------- BOOT ----------------------------- */';

let src = fs.readFileSync(SRC, 'utf8');
const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';

if(!src.includes('manifest.webmanifest')){
  if(!src.includes(TITLE)) throw new Error('title tag nahi mila');
  src = src.replace(TITLE, TITLE + HEAD_EXTRA);
}

if(!src.includes('id="installBtn"')){
  if(!src.includes(HELP)) throw new Error('help button anchor nahi mila');
  src = src.replace(HELP, PWA_BUTTONS + HELP);
}

if(!src.includes(PWA_START)){
  const a = cur.indexOf(PWA_START), b = cur.indexOf(BOOT);
  if(a < 0 || b < 0 || b < a) throw new Error('PWA script deploy copy me nahi mila');
  if(cur.indexOf(PWA_START, a + 1) !== -1) throw new Error('PWA block deploy copy me do baar hai');
  src = src.replace(BOOT, cur.slice(a, b) + BOOT);
}

fs.writeFileSync(OUT, src);

/* ---- guard: ek bhi id do baar na ho ---- */
const ids = {};
for(const m of src.matchAll(/\bid="([\w-]+)"/g)) ids[m[1]] = (ids[m[1]] || 0) + 1;
const dupes = Object.entries(ids).filter(([, n]) => n > 1);

const need = ['manifest.webmanifest', 'serviceWorker.register', 'id="installBtn"'];
const missing = need.filter(n => !src.includes(n));

if(dupes.length){
  console.log('✗ duplicate id — sync ne cheezein dobara chipka di:');
  for(const [id, n] of dupes.slice(0, 10)) console.log('    ' + id + ' × ' + n);
  process.exit(1);
}
if(missing.length){ console.log('✗ missing: ' + missing.join(', ')); process.exit(1); }
console.log('✓ synced · PWA hooks intact · koi duplicate id nahi');
