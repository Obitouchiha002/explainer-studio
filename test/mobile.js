/* Mobile layout check — CSS ko seedha padh kar. DOM stub CSS lagata nahi,
   isliye ye rules khud verify karte hain. Har check ek asli mobile problem hai. */
const fs = require('fs'), path = require('path');
const APP = process.env.APP || path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(APP, 'utf8');
const css = html.split('<style>')[1].split('</style>')[0];

const mob = (css.match(/@media\(max-width:760px\)\{([\s\S]*?)\n  \}\n/) || [,''])[1] ||
            (css.match(/@media\(max-width:760px\)\{([\s\S]*)/) || [,''])[1];

const checks = [];
const T = (name, fn) => { try{ fn(); checks.push(['ok', name]); }
                          catch(e){ checks.push(['bad', name, e.message]); } };

T('mobile block maujood hai', () => {
  if(!mob || mob.length < 200) throw new Error('@media(max-width:760px) mila hi nahi');
});

T('touch targets 44px+ hain (chhote nahi)', () => {
  const m = mob.match(/\.tool\{[^}]*width:(\d+)px/);
  if(!m) throw new Error('.tool ka mobile size set hi nahi');
  const px = +m[1];
  if(px < 44) throw new Error('tool ' + px + 'px — touch ke liye 44px minimum chahiye');
});

T('panel bottom sheet bante hain, beech me nahi tairte', () => {
  for(const p of ['insp','galp','layp','flowp','animp']){
    const re = new RegExp('\\.' + p + '[^{]*\\{[^}]*bottom:0');
    if(!re.test(mob.replace(/\s+/g, ' ').replace(/, /g, ',')) && !/bottom:0 !important/.test(mob))
      throw new Error(p + ' sheet nahi ban raha');
  }
  if(!/border-radius:22px 22px 0 0/.test(mob)) throw new Error('sheet ka upar wala curve nahi');
  if(!/::before/.test(mob)) throw new Error('sheet pe pakadne wali lakeer nahi');
});

T('iPhone ki home line ke liye jagah chhodi hai', () => {
  const n = (mob.match(/env\(safe-area-inset-bottom\)/g) || []).length;
  if(n < 4) throw new Error('safe-area sirf ' + n + ' jagah — dock/sheets home line ke neeche chale jayenge');
});

T('sheet khule to dock chhup jaata hai', () => {
  if(!/body\.sheet-open .dock[^}]*display:none/.test(mob.replace(/\s+/g,' ')))
    throw new Error('sheet aur dock dono ek saath dikhenge — aapas me ladenge');
  if(!/syncSheets/.test(html)) throw new Error('sheet-open lagane wala code nahi');
});

T('touch pe hover wali cheezein band hain', () => {
  if(!/\.tipbox\{display:none/.test(mob.replace(/\s+/g,''))) throw new Error('tooltip mobile pe band nahi');
  if(!/\.tool:hover\{transform:none/.test(mob.replace(/\s+/g,''))) throw new Error('hover lift mobile pe chal raha hai');
  if(!/isMobile\(\)/.test(html)) throw new Error('tool ka naam batane wala code nahi');
});

T('mode buttons pe icon hai jab label chhupta hai', () => {
  const modes = [...html.matchAll(/<button class="mbtn[^"]*"\s*data-ico="([^"]+)"/g)];
  if(modes.length < 4) throw new Error('sirf ' + modes.length + ' mode buttons pe icon — baaki khaali dikhenge');
});

T('modal poori chaudai lete hain', () => {
  if(!/\.helpbox\{[^}]*width:100%/.test(mob.replace(/\s+/g,''))) throw new Error('help modal full width nahi');
  if(!/\.startp\{[^}]*bottom:0/.test(mob.replace(/\s+/g,''))) throw new Error('start panel sheet nahi banta');
});

console.log('\nMOBILE LAYOUT');
console.log(checks.map(c => c[0]==='ok' ? '  ✓ '+c[1] : '  ✗ '+c[1]+' → '+c[2]).join('\n'));
const bad = checks.filter(c => c[0]==='bad').length;
console.log(bad ? '\n' + bad + ' FAIL\n' : '\nsab pass ✓\n');
process.exit(bad ? 1 : 0);
