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
  const st = (css.match(/\n  \.startp\{([^}]*)\}/) || [,''])[1].replace(/\s+/g,'');
  if(!/inset:0/.test(st)) throw new Error('project screen poori screen nahi leti');
  if(!/safe-area-inset-bottom/.test(mob.replace(/\s+/g,'').match(/\.startp\{([^}]*)\}/)?.[1] || ''))
    throw new Error('project screen phone ke notch/bar ke neeche chhup jayegi');
});

/* ---- portrait vs landscape ---- */
const full = css.replace(/\s+/g, ' ');

T('portrait aur landscape ke alag layout hain', () => {
  if(!/body\.mob\.portrait \.dock/.test(full)) throw new Error('portrait ka dock layout nahi');
  if(!/body\.mob\.landscape \.dock/.test(full)) throw new Error('landscape ka dock layout nahi');
  if(!/isLandscape\(\)/.test(html)) throw new Error('orientation detect karne wala code nahi');
  if(!/orientationchange/.test(html)) throw new Error('phone ghumane par kuch hota hi nahi');
});

T('landscape me tools side me jaate hain (neeche nahi)', () => {
  const m = full.match(/body\.mob\.landscape \.dock\{([^}]*)\}/);
  if(!m) throw new Error('landscape dock rule nahi');
  if(!/flex-direction:\s*column/.test(m[1]))
    throw new Error('landscape me dock abhi bhi horizontal — unchai waise hi kam hai');
  if(!/left:/.test(m[1])) throw new Error('rail baayin taraf nahi lagi');
});

T('landscape me panel daayin se, portrait me neeche se', () => {
  if(!/body\.mob\.landscape \.insp[^{]*\{[^}]*right:0/.test(full))
    throw new Error('landscape me panel daayin taraf se nahi aata');
  if(!/body\.mob\.landscape \.insp[^{]*\{[^}]*top:42px/.test(full))
    throw new Error('landscape panel poori unchai nahi le raha');
});

T('portrait me tools 50px+ (angoothe ke liye)', () => {
  const m = full.match(/body\.mob\.portrait \.tool\{([^}]*)\}/);
  if(!m) throw new Error('portrait tool size set nahi');
  const px = +(m[1].match(/width:(\d+)px/) || [,0])[1];
  if(px < 50) throw new Error('portrait me tool ' + px + 'px — angoothe ke liye 50px chahiye');
});

T('phone pe ⋯ menu bottom sheet banta hai', () => {
  if(!/\.pop\.menusheet/.test(full)) throw new Error('menu sheet ka style nahi');
  if(!/menusheet \.tbtn\{[^}]*min-height:52px/.test(full))
    throw new Error('menu ke items chhote hain — touch me mushkil');
  if(!/menusheet/.test(html.split('<style>')[0] + html.split('</style>')[1]))
    throw new Error('menusheet lagane wala JS nahi');
});

T('project screen aur tutorial phone pe fit hote hain', () => {
  const st = (full.match(/\.stbox\{([^}]*)\}/) || [,''])[1];
  if(!/min\(/.test(st)) throw new Error('project box ki width fix hai — chhoti screen pe kat jayegi');
  if(!/overflow-y:\s*auto/.test((full.match(/\.startp\{([^}]*)\}/) || [,''])[1]))
    throw new Error('project screen scroll nahi hoti — chhote phone pe Start button neeche chhup jayega');
  const opts = (full.match(/\.stopts\{([^}]*)\}/) || [,''])[1];
  if(!/auto-fit/.test(opts)) throw new Error('naap ke option ek line me nahi tootenge');
  const card = (full.match(/\.tutcard\{([^}]*)\}/) || [,''])[1];
  if(!/min\(/.test(card) || !/100vw/.test(card))
    throw new Error('tutorial card ki width phone ke hisaab se nahi');
});

console.log('\nMOBILE LAYOUT');
console.log(checks.map(c => c[0]==='ok' ? '  ✓ '+c[1] : '  ✗ '+c[1]+' → '+c[2]).join('\n'));
const bad = checks.filter(c => c[0]==='bad').length;
console.log(bad ? '\n' + bad + ' FAIL\n' : '\nsab pass ✓\n');
process.exit(bad ? 1 : 0);
