/* Contrast check — "achha lag raha hai" ki jagah naap ke.
   WCAG: normal text 4.5:1, UI ke kinare/icons 3:1.
   Ye isliye alag file me hai ki design badle to yahin pakda jaye. */
const fs = require('fs'), path = require('path');
const APP = process.env.APP || path.join(__dirname, '..', 'index.html');
const css = fs.readFileSync(APP, 'utf8').split('<style>')[1].split('</style>')[0];

const hex = h => { h = h.replace('#',''); return [0,2,4].map(i => parseInt(h.slice(i,i+2), 16)); };
const lum = c => { const a = c.map(v => { v/=255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); });
                   return .2126*a[0] + .7152*a[1] + .0722*a[2]; };
const ratio = (a, b) => { const l1 = lum(hex(a)), l2 = lum(hex(b));
                          return (Math.max(l1,l2) + .05) / (Math.min(l1,l2) + .05); };

const block = re => (css.match(re) || [,''])[1];
const pick = (b, k) => { const m = b.match(new RegExp('\\' + k + ':\\s*(#[0-9A-Fa-f]{6})')); return m ? m[1] : null; };

const light = block(/\[data-theme="light"\]\{([\s\S]*?)\n  \}/);
const dark  = block(/:root\{([\s\S]*?)\n  \}/);

/* WCAG 3:1 sirf un kinaron pe lagta hai jo batate hain ki cheez interactive hai
   (input, select, button). Panel ka kinara decorative hai — alagav shadow se
   aata hai. Isliye --edge naapte hain, --line nahi. Ye badla isliye kyunki
   --line ko gehra karne se poora UI bhaari outline wala lagne laga tha. */
const rows = [
  ['light', 'input border',      '--edge',  '--panel2', 3.0],
  ['light', 'input border/bg',   '--edge',  '--bg',     3.0],
  ['light', 'muted on panel',    '--muted', '--panel2', 4.5],
  ['light', 'sub on panel',      '--sub',   '--panel2', 4.5],
  ['light', 'ink on canvas',     '--ink',   '--bg',     4.5],
  ['light', 'blue on canvas',    '--blue',  '--bg',     3.0],
  ['dark',  'input border',      '--edge',  '--panel2', 3.0],
  ['dark',  'input border/bg',    '--edge',  '--bg',     3.0],
  ['dark',  'muted on panel',    '--muted', '--panel2', 4.5],
  ['dark',  'sub on panel',      '--sub',   '--panel2', 4.5],
  ['dark',  'ink on canvas',     '--ink',   '--bg',     4.5],
];

let bad = 0;
console.log('\nCONTRAST');
for(const [theme, name, fg, bgk, need] of rows){
  const b = theme === 'light' ? light : dark;
  const a = pick(b, fg), c = pick(b, bgk);
  if(!a || !c){ console.log('  ? ' + theme + '  ' + name + ' (token nahi mila)'); bad++; continue; }
  const r = ratio(a, c);
  const ok = r >= need;
  if(!ok) bad++;
  console.log('  ' + (ok ? '✓' : '✗') + ' ' + theme.padEnd(6) + name.padEnd(20) +
              r.toFixed(2) + '  (chahiye ' + need + ')');
}
console.log(bad ? '\n' + bad + ' FAIL\n' : '\nsab pass ✓\n');
process.exit(bad ? 1 : 0);
