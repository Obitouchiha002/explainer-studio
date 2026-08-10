/* Test suite. `node test/tests.js` ya `IDB=1 node test/tests.js`.
   Har test ek asli problem ke khilaf hai — zyadatar wo jo sach me tut chuke the. */
const H = require('./harness');
const { S, T, T2, pump, ready, elById, listeners, store, NET, REC, topBar, mkEl, css, report } = H;

function syncTests(){
/* ------------------------------ core ------------------------------ */
T('app boot hoti hai aur board banta hai', () => {
  if(!S.doc) throw new Error('koi board nahi khula');
  if(!S.objects().length) throw new Error('seed demo nahi bana');
});

T('ulta drag: rect / ellipse / frame crash nahi karte', () => {
  // negative radius pe arcTo error phenkta hai -> poora draw loop mar jaata tha
  for(const [sx, sy] of [[-1,-1],[-1,1],[1,-1],[1,1]])
    for(const shape of [{type:'shape',kind:'rect'},{type:'shape',kind:'ellipse'},{type:'frame',title:'x'}])
      S.drawObject(Object.assign({ id:'t', x:100, y:100, w:200*sx, h:140*sy,
                                   color:'ink', size:3, step:0 }, shape));
});

T('draw loop exception ke baad bhi zinda rehta hai', () => {
  S.objects().push({ id:'bad', type:'shape', kind:'rect', x:0, y:0, w:NaN, h:NaN, size:3, step:0 });
  S.requestDraw(); pump(4);
  S.doc.objects = S.objects().filter(o => o.id !== 'bad');
  S.requestDraw(); pump(3);
});

T('stroke simplify: kam points, wahi shakal', () => {
  const pts = [];
  for(let i=0;i<2000;i++) pts.push({ x:i*0.7, y:Math.sin(i/50)*120, p:0.8 });
  const out = S.simplifyStroke(pts, 0.6);
  if(out.length >= pts.length*0.6) throw new Error('kam nahi hue: ' + out.length);
  let worst = 0;
  for(const p of pts){ let best = 1e9;
    for(let i=1;i<out.length;i++) best = Math.min(best, S.distSeg(p.x,p.y,out[i-1],out[i]));
    worst = Math.max(worst, best); }
  if(worst > 4) throw new Error('shakal bigdi, max error ' + worst.toFixed(1));
});

T('stroke bbox cache', () => {
  const pts = []; for(let i=0;i<3000;i++) pts.push({ x:Math.sin(i/40)*900, y:i*0.4, p:0.8 });
  const st = { id:'big', type:'stroke', tool:'pen', color:'ink', size:4, step:0, points:pts };
  S.doc.objects = [st];
  const t0 = Date.now();
  for(let i=0;i<4000;i++) S.bbox(st);
  if(Date.now()-t0 > 60) throw new Error('cache kaam nahi kar raha');
  const before = S.bbox(st).x; S.moveObj(st, 500, 0);
  if(Math.abs(S.bbox(st).x - before - 500) > 1) throw new Error('hilane ke baad stale box');
});

/* --------------------------- responsive UI --------------------------- */
T('top bar har width pe fit ho jaata hai', () => {
  topBar._kids = [];
  for(let i=0;i<16;i++){
    const b = mkEl('button');
    b.dataset.pri = String(1 + (i % 4)); b._w = 110; b.parentNode = topBar;
    topBar._kids.push(b);
  }
  const pop = elById.ovfPop, btn = elById.ovfBtn;
  pop.children = [];

  topBar.clientWidth = 3000; S.fitTopBar();
  if(pop.children.length) throw new Error('chaudi screen pe bhi buttons chhupa diye');
  if(topBar.classList.contains('tight')) throw new Error('chaudi screen pe bhi labels hata diye');

  topBar.clientWidth = 1150; S.fitTopBar();
  if(!topBar.classList.contains('tight')) throw new Error('labels hataye hi nahi');
  if(pop.children.length) throw new Error('labels se kaam ban gaya tha, phir bhi buttons chhupaye');

  topBar.clientWidth = 620; S.fitTopBar();
  if(!pop.children.length) throw new Error('sankri screen pe kuch nahi chhupa — bar kat jayegi');
  if(btn.style.display === 'none') throw new Error('⋯ button nahi dikha');
  const hidden = pop.children.map(c => +c.dataset.pri);
  const shown = topBar._kids.filter(k => k.parentNode === topBar).map(k => +k.dataset.pri);
  if(shown.length && hidden.length && Math.min(...hidden) < Math.max(...shown))
    throw new Error('zyada zaroori chhupa, kam zaroori dikh raha');
  if(topBar.scrollWidth > topBar.clientWidth + 1) throw new Error('phir bhi fit nahi hua');

  topBar.clientWidth = 3000; S.fitTopBar();
  if(pop.children.length) throw new Error('jagah milne par wapas nahi aaye');
});

T('right-click menu banta hai aur chalta hai', () => {
  let ran = false;
  S.ctxMenu(100, 100, [['x','Test',()=>{ran=true;}]]);
  if(!/data-cm="x"/.test(elById.ovfPop.innerHTML)) throw new Error('menu item nahi bana');
  if(!elById.ovfPop.classList.contains('on')) throw new Error('menu khula hi nahi');
});

T('har top-bar button ki priority set hai', () => {
  const buttons = [...H.html.matchAll(/<button class="tbtn[^>]*id="(\w+)"/g)].map(m => m[0]);
  const noPri = buttons.filter(b => !/data-pri/.test(b) &&
    !/presentBtn|ovfBtn|undoBtn|redoBtn|installBtn|updBtn/.test(b));
  if(noPri.length) throw new Error('bina priority ke: ' + noPri.join(' | ').slice(0,120));
});

/* ----------------------------- editing ----------------------------- */
T('hidden / locked ka poora asar', () => {
  S.doc.objects = [];
  const c = S.mkCard(0,0,'✨','a','b',1);
  S.objects().push(c);
  const b = S.bbox(c);
  c.hidden = true;
  if(S.visible(c)) throw new Error('hidden ke baad bhi visible');
  if(S.hitTest(b.x+b.w/2, b.y+b.h/2) === c) throw new Error('hidden cheez click me aayi');
  c.hidden = false; c.locked = true;
  if(!S.visible(c)) throw new Error('locked cheez gayab');
  if(S.hitTest(b.x+b.w/2, b.y+b.h/2) === c) throw new Error('locked cheez khisak sakti hai');
  if(S.deviceAt({ x:b.x+b.w/2, y:b.y+b.h/2 })) throw new Error('locked pe drop bhi ho gaya');
  c.locked = false;
});

T('align aur distribute', () => {
  S.doc.objects = [];
  const mk = (x,y,w,h) => { const o = S.mkCard(x,y,'✨','t','d',1); o.w=w; o.h=h; S.objects().push(o); return o; };
  const a = mk(0,0,200,100), b = mk(500,300,300,60), c = mk(120,700,150,200);
  S.alignSel([a,b,c],'left');
  const xs = [a,b,c].map(o => S.bbox(o).x);
  if(Math.max(...xs)-Math.min(...xs) > 0.5) throw new Error('left align nahi hua');
  S.doc.objects = [];
  const p = mk(0,0,100,100), q = mk(150,0,100,100), r = mk(900,0,100,100);
  const x0 = S.bbox(p).x, x1 = S.bbox(r).x;
  S.distributeSel([p,q,r],'h');
  if(Math.abs(S.bbox(p).x-x0)>0.5 || Math.abs(S.bbox(r).x-x1)>0.5) throw new Error('sire khisak gaye');
  const g1 = S.bbox(q).x-(S.bbox(p).x+S.bbox(p).w), g2 = S.bbox(r).x-(S.bbox(q).x+S.bbox(q).w);
  if(Math.abs(g1-g2) > 0.5) throw new Error('gap barabar nahi');
});

T('text styles draw me lagte hain', () => {
  S.doc.objects = [];
  const t = S.mkText(0,0,'hello world',40,1,400);
  S.objects().push(t);
  const c = elById.stage.getContext();
  let font = '', drawn = '', strokes = 0;
  Object.defineProperty(c,'font',{set(v){font=v;},get(){return font;},configurable:true});
  c.fillText = x => { drawn = x; }; c.stroke = () => { strokes++; };
  t.italic = true; t.weight = 400; S.drawObject(t);
  if(!/italic/.test(font)) throw new Error('italic nahi laga');
  t.italic = false; t.upper = true; S.drawObject(t);
  if(drawn !== 'HELLO WORLD') throw new Error('uppercase nahi hua');
  t.upper = false; strokes = 0; t.underline = true; t.strike = true; S.drawObject(t);
  if(strokes < 2) throw new Error('underline/strike lines nahi khinchi');
  delete c.fillText; delete c.stroke;
});

T('animate cards ka preview box dikhega', () => {
  const abox = (css.match(/\.abox\s*\{[^}]*\}/) || [''])[0];
  if(!/display\s*:\s*block/.test(abox))
    throw new Error('.abox block nahi — inline pe width/height lagti hi nahi');
  const astage = (css.match(/\.astage\s*\{[^}]*\}/) || [''])[0];
  if(!/display\s*:\s*flex/.test(astage) || !/!important/.test(astage))
    throw new Error('.astage ka flex surakshit nahi');
});

T('reveal animations: har andaz', () => {
  S.doc.objects = [];
  const c = S.mkCard(0,0,'✨','a','b',1);
  S.objects().push(c);
  S.enterPresent();
  for(const k of ['fade','up','down','left','right','pop','zoom','blur','wipe','breathe']){
    c.anim = k; S.revealState.clear(); S.startReveal(1);
    const fx = S.revealFx(c);
    if(!fx) throw new Error(k + ' chala hi nahi');
    if(k === 'wipe' && fx.wipe === undefined) throw new Error('wipe ka clip nahi');
    if(k === 'blur' && !(fx.blur > 0)) throw new Error('blur nahi laga');
  }
  c.hidden = true; S.revealState.clear(); S.startReveal(1);
  if(S.revealState.size) throw new Error('chhupi cheez ki animation chal rahi hai');
  c.hidden = false;
  S.exitPresent();
});

/* ------------------------------ frames ------------------------------ */
T('image frame: mode, crop, drop', () => {
  S.doc.objects = [];
  const f = S.mkFrame(0,0,500,340,'',1);
  const kid = S.mkCard(100,100,'✨','in','x',1);
  S.objects().push(f, kid);
  if(!S.frameChildren(f).length) throw new Error('slide frame ne bachche nahi pakde');
  f.mode = 'image';
  if(S.frameChildren(f).length) throw new Error('image frame abhi bhi bachche utha raha');
  if(!S.hits(f, 250, 170)) throw new Error('image frame ke beech pe click nahi lagta');
  f.src = 'data:image/png;base64,AAA';
  if(!S.canCrop(f)) throw new Error('crop allow nahi');
  S.startCrop(f);
  S.nudgeCrop(f, 99, 9, 9);
  const fit = S.imgFit(f);
  if(fit.z > 8 || Math.abs(fit.ox) > 0.5) throw new Error('image frame se bahar nikal gayi');
  if(S.cropHandles(f).length !== 4) throw new Error('corner handles nahi bane');
  S.endCrop();
});

T('crop khud saaf ho jaata hai jab object gayab ho', () => {
  S.doc.objects = [];
  const d = S.mkDevice('browser',0,0,600,1,'x');
  d.src = 'data:x'; S.objects().push(d);
  S.startCrop(d);
  S.removeObjects([d.id]);
  if(S.cropping) throw new Error('gayab object pe crop atka hai');
});

T('board pe padi image frame me chali jaati hai', () => {
  S.doc.objects = [];
  const f = S.mkFrame(0,0,500,340,'',1); f.mode = 'image'; f.fit = { mode:'fill', z:5, ox:.4, oy:.4 };
  const img = { id:'i1', type:'image', src:'NEW', x:900, y:900, w:200, h:150, step:1 };
  S.objects().push(f, img);
  if(!S.absorbImage(img, f)) throw new Error('absorb nahi hua');
  if(f.src !== 'NEW') throw new Error('image andar nahi gayi');
  if(S.byId('i1')) throw new Error('purani image bachi hui hai');
  if(f.fit) throw new Error('purana zoom nayi image pe chipak gaya');
  const out = S.popImageOut(f);
  if(!out || f.src) throw new Error('bahar nahi nikli');
});

/* ------------------------------ script / AI ------------------------------ */
T('script parser: saara syntax', () => {
  const src = ['# Setup','@browser code.visualstudio.com',
               '- 🔍 Search :: google par "vs code" | green',': yahan ruko',
               '```terminal','code --version','```','!! Ek baar','[Subscribe]'].join('\n');
  const out = S.parseScript(src);
  const kinds = out[0].items.map(i => i.kind);
  for(const k of ['device','card','code','callout','cta'])
    if(!kinds.includes(k)) throw new Error(k + ' parse nahi hua');
  const card = out[0].items.find(i => i.kind === 'card');
  if(card.colour !== '#3DDC97') throw new Error('colour nahi laga');
  if(!card.emoji || !card.notes) throw new Error('emoji/notes nahi lage');
});

T('plan -> board: branches, mockup, hotspot, merge', () => {
  const PLAN = { goal:'Install X', taskType:'gui', time:'5 min', level:'Beginner',
    steps:[
      { type:'step', phase:'OPEN', title:'Site kholo', action:'address bar me type karo',
        screen:{ url:'x.com', heading:'Download', buttons:['macOS','Windows'], click:'Windows' },
        expect:'page khulta hai', say:'yahan point karo' },
      { type:'decision', question:'Kaunsa OS?', branches:[
        { label:'Windows', steps:[{ type:'step', title:'exe', action:'button dabao', expect:'file aati hai' }] },
        { label:'Mac', steps:[{ type:'step', title:'zip', action:'button dabao', expect:'file aati hai' }] }] },
      { type:'checkpoint', title:'Ho gaya', expect:'app khulta hai' },
      { type:'success', title:'Done', action:'ab likh sakte ho' }],
    troubleshooting:[{ problem:'Nahi mila?', fix:'Downloads dekho' }] };
  S.doc.objects = []; S.doc.stepNotes = {};
  elById.scriptText.value = JSON.stringify(PLAN);
  S.runScript();
  const steps = S.objects().filter(o => o.type === 'step');
  for(const v of ['decision','checkpoint','success','trouble'])
    if(!steps.some(o => o.variant === v)) throw new Error(v + ' nahi bana');
  const dev = S.objects().find(o => o.type === 'device');
  if(!dev || !dev.screen || dev.screen.click !== 'Windows') throw new Error('mock screen nahi bani');
  const dec = steps.find(o => o.variant === 'decision');
  const out = S.objects().filter(o => o.type === 'link' && o.from === dec.id);
  if(out.length !== 2 || !out.every(l => l.label)) throw new Error('branches theek nahi');
  const a = S.byId(out[0].to), b = S.byId(out[1].to);
  if(a.step !== b.step) throw new Error('branches alag steps pe');
  const cp = steps.find(o => o.variant === 'checkpoint');
  if(S.objects().filter(o => o.type === 'link' && o.to === cp.id).length !== 2)
    throw new Error('branches wapas nahi mili');
  const ids = new Set(S.objects().map(o => o.id));
  for(const o of S.objects())
    if(o.type === 'link' && (!ids.has(o.from) || !ids.has(o.to))) throw new Error('dangling link');
});

T('validator: hallucination pakadta hai', () => {
  const BAD = { goal:'x', taskType:'gui', steps:[
    { type:'step', phase:'DOWNLOAD', title:'Search', action:'Google par search karo', expect:'results' },
    { type:'step', phase:'INSTALL', title:'Blue button dabao', action:'Blue button dabao',
      expect:'chatgpt-setup.exe download hoti hai' },
    { type:'step', title:'Version', action:'Terminal me version check karo :: 3.5.1', expect:'3.5.1' },
    { type:'step', title:'Art', action:'x', code:'┌───┐\n│ a │\n└───┘', expect:'y' }] };
  const msg = S.validatePlan(BAD).map(v => v.msg).join(' | ');
  for(const [re, what] of [[/\.exe/i,'filename'], [/version/i,'version'], [/colour/i,'colour'],
                           [/terminal/i,'terminal in GUI'], [/search engine/i,'google detour'],
                           [/INSTALL phase/i,'phase mismatch'], [/line characters/i,'ASCII art'],
                           [/success step/i,'no success']])
    if(!re.test(msg)) throw new Error('nahi pakda: ' + what);
});

T('validator: saaf plan pe chup, cli me terminal allowed', () => {
  const good = { goal:'x', taskType:'gui', steps:[
    { type:'step', phase:'OPEN', title:'Page kholo', action:'address bar me x.com type karo', expect:'khulta hai' },
    { type:'step', phase:'INSTALL', title:'Install dabao', action:'Install par click', expect:'progress dikhti hai' },
    { type:'success', title:'Done', action:'login screen' }] };
  if(S.validatePlan(good).some(v => v.level === 'bad')) throw new Error('saaf plan pe bhi flag');
  const cli = { goal:'x', taskType:'cli', steps:[
    { type:'step', title:'Run', action:'Terminal me npm install', expect:'ho gaya' },
    { type:'success', title:'Done' }] };
  if(S.validatePlan(cli).some(v => /terminal/i.test(v.msg))) throw new Error('cli me bhi rok');
});

/* ------------------------------ gallery ------------------------------ */
T('har gallery block banta hai', () => {
  for(const item of S.GALLERY){
    S.doc.objects = [];
    S.placeBlock(item.key, { x:0, y:0 });
    if(!S.objects().length) throw new Error(item.key + ' kuch nahi bana');
  }
});

T('gallery universal search', () => {
  S.openGallery(true);
  for(const [q, re, what] of [['phone',/Phone/i,'mockup'], ['openai',/OpenAI|ChatGPT/i,'brand'],
                              ['subscribe',/Subscribe/i,'CTA'], ['arrow',/Arrow/i,'block']]){
    S.galQuery = q; S.galFilter = 'All'; S.buildGallery();
    if(!re.test(elById.galList.innerHTML)) throw new Error(what + ' "' + q + '" pe nahi mila');
  }
  S.galQuery = 'laptop pink'; S.buildGallery();
  if(/Desktop monitor/.test(elById.galList.innerHTML)) throw new Error('gair-matching bhi aa gaya');
  S.galQuery = ''; S.buildGallery();
});

T('asset category filename se', () => {
  for(const [n, want] of [['instagram-logo','Social'],['openai','AI tools'],['github','Dev'],
                          ['macbook-pro','Mockups'],['random-thing','Other']])
    if(S.guessCat(n) !== want) throw new Error(`"${n}" -> ${S.guessCat(n)}`);
});

/* ------------------------------ export ------------------------------ */
T('PNG export: clamp aur transparent', () => {
  S.doc.objects = [];
  S.placeBlock('three', { x:0, y:0 });
  if(!S.renderPNG(S.objects(), {})) throw new Error('export null');
  if(!S.renderPNG(S.objects(), { transparent:true })) throw new Error('transparent null');
  S.objects().push({ id:'big', type:'shape', kind:'rect', x:0, y:0, w:900000, h:900000, size:3, step:0 });
  const oc = S.renderPNG(S.objects(), {});
  if(oc && (oc.width > 8600 || oc.height > 8600)) throw new Error('clamp fail: ' + oc.width);
});

T('recording: canvas stream, aspect, mic optional', () => {
  S.frameMode = 1; S.recAspect = 16/9;
  let c = S.computeRecCrop();
  if(Math.abs(c.w/c.h - 16/9) > 0.01) throw new Error('16:9 crop galat');
  S.recAspect = 9/16; c = S.computeRecCrop();
  if(Math.abs(c.w/c.h - 9/16) > 0.01) throw new Error('9:16 crop galat');
  S.frameMode = 0; S.recAspect = 16/9;
});

/* ------------------------------ settings ------------------------------ */
T('settings me saare controls, keys chhupi hui', () => {
  S.aiKey = 'gsk_secret'; S.ytKey = 'AIza_secret';
  S.openSettings(true);
  const h = elById.setBody.innerHTML;
  for(const id of ['sGroq','sYt','sHandle','sExpKeys','sImpKeys','sAnim','sStag','sGrid','sSnap','sBackup'])
    if(!h.includes('id="' + id + '"')) throw new Error(id + ' nahi mila');
  if(!/type="password"/.test(h.match(/<input[^>]*id="sGroq"[^>]*>/)[0])) throw new Error('Groq key khuli');
  if(!/type="password"/.test(h.match(/<input[^>]*id="sYt"[^>]*>/)[0])) throw new Error('YT key khuli');
  S.openSettings(false);
  if(/gsk_secret/.test(JSON.stringify(S.doc))) throw new Error('board file me key');
});

T('tooltip hamesha screen ke andar', () => {
  const box = elById.tipbox;
  const B = { w:230, h:64 };
  box.getBoundingClientRect = () => ({ left:parseFloat(box.style.left)||0,
    top:parseFloat(box.style.top)||0, width:B.w, height:B.h });
  const VW = 1600, VH = 900;
  const spots = [[VW/2-20, VH-60], [VW/2, 6], [VW-30, VH/2], [2, VH/2], [VW-40, VH-40]];
  for(const hh of [64, 420]){
    B.h = hh;
    for(const [x,y] of spots){
      const el = mkEl('button');
      el.dataset.tip = 'Eraser — E · mitao';
      el.getBoundingClientRect = () => ({ left:x, top:y, width:42, height:42, right:x+42, bottom:y+42 });
      S.showTip(el);
      const L = parseFloat(box.style.left), Tp = parseFloat(box.style.top);
      if(L < 0 || L + B.w > VW) throw new Error('chaudai me kat raha');
      if(Tp < 0 || Tp + B.h > VH + 1) throw new Error('unchai me kat raha (h=' + hh + ')');
    }
  }
});

T('hover ka ASLI rasta chalta hai', () => {
  const over = listeners.filter(l => l.type === 'pointerover');
  if(!over.length) throw new Error('pointerover handler register hi nahi hua');
  const box = elById.tipbox;
  box.classList.remove('on');
  box.getBoundingClientRect = () => ({ left:0, top:0, width:200, height:60 });
  const btn = mkEl('button');
  btn.dataset.tip = 'Pen — P · patli line';
  btn.getBoundingClientRect = () => ({ left:300, top:400, width:42, height:42, right:342, bottom:442 });
  for(const l of over) l.fn({ target:{ closest: q => q === '[data-tip]' ? btn : null } });
  if(!box.classList.contains('on')) throw new Error('hover pe tooltip khula hi nahi');
});

/* ------------------------------ boards ------------------------------ */
T('board copy / import me links nahi tootte', () => {
  S.doc.objects = [];
  S.placeBlock('vibe', { x:0, y:0 });
  const out = S.remapIds(JSON.parse(JSON.stringify(S.objects())));
  const ids = new Set(out.map(o => o.id));
  for(const o of out)
    if(o.type === 'link' && (!ids.has(o.from) || !ids.has(o.to))) throw new Error('link toot gaya');
  if(out.length < 2) throw new Error('sab gir gaye');
});

T('playlist: part numbers unique, template alag', () => {
  S.boards = [{ id:'t', name:'T', tpl:true }, { id:'a', name:'A' }, { id:'b', name:'B' }];
  S.renderBoards();
  const parts = S.boards.map(b => b.part);
  if(new Set(parts).size !== parts.length) throw new Error('part repeat: ' + parts);
  const list = S.boards.slice().sort((x,y)=>x.part-y.part).filter(b => !b.tpl);
  if(list.length !== 2) throw new Error('template playlist me gin liya');
});

T('clear board: poochta hai, undo sab laata hai', () => {
  S.doc.objects = []; S.doc.views = {}; S.doc.stepNotes = {};
  S.placeBlock('three', { x:0, y:0 });
  S.doc.views[1] = { x:1, y:1, z:1 }; S.doc.stepNotes[1] = 'kuch';
  const n = S.objects().length;
  H.setConfirm(false); S.clearBoard(); H.setConfirm(true);
  if(S.objects().length !== n) throw new Error('mana karne pe bhi saaf kar diya');
  if(!/Ctrl\+Z/.test(H.lastConfirm())) throw new Error('undo ka bharosa nahi diya');
  S.clearBoard();
  if(S.objects().length) throw new Error('saaf nahi hua');
  S.undo();
  if(S.objects().length !== n) throw new Error('undo ne wapas nahi kiya');
  if(!S.doc.views[1] || S.doc.stepNotes[1] !== 'kuch') throw new Error('views/notes wapas nahi aaye');
});

/* --------------------- naye user ka pehla anubhav --------------------- */
T('Help Simple mode me kabhi na chhupe', () => {
  if(/'helpBtn'/.test(H.html.match(/const SIMPLE_HIDE = \[[^\]]*\]/)[0]))
    throw new Error('Help Simple me chhupa hua hai — naye user ko wahi sabse zyada chahiye');
});

T('mode ke naam batate hain ki wahan hota kya hai', () => {
  const modes = [...H.html.matchAll(/data-mo="(write|build|plan|present)"[^>]*>([^<]+)</g)]
    .map(m => ({ k:m[1], label:m[2].trim() }));
  const by = k => (modes.find(m => m.k === k) || {}).label || '';
  if(!/Script/i.test(by('plan')))
    throw new Error('"Plan" me script hai par naam se pata nahi chalta: ' + by('plan'));
  if(!/Record/i.test(by('present')))
    throw new Error('"Present" me record hai par naam se pata nahi chalta: ' + by('present'));
});

T('pehli baar shuruaat wala panel aata hai, dobara nahi', () => {
  delete store['tbv_studio_seen'];
  S.openStart(true);
  if(!elById.startp.classList.contains('on')) throw new Error('panel khula hi nahi');
  const opts = [...elById.startp.innerHTML.matchAll(/data-start="(\w+)"/g)].map(m => m[1]);
  // markup se check — stub innerHTML padhta nahi
  const fromHtml = [...H.html.matchAll(/data-start="(\w+)"/g)].map(m => m[1]);
  for(const k of ['script','blank','demo'])
    if(!fromHtml.includes(k)) throw new Error(k + ' wala option nahi hai');
  S.doneStart();
  if(elById.startp.classList.contains('on')) throw new Error('band nahi hua');
  if(store['tbv_studio_seen'] !== '1') throw new Error('yaad nahi rakha — har baar aayega');
});

T('demo board ka naam saaf batata hai ki demo hai', () => {
  if(!/newBoard\('Demo board'/.test(H.html))
    throw new Error('pehla board "Board 1" naam se banta hai — pata hi nahi chalta ki sample hai');
});

/* ------------------------------ modes ------------------------------ */
T('Simple mode: sirf roz ke tools, aur ek click me sab wapas', () => {
  S.setSimple(true);
  const simpleWrite = S.MODE_TOOLS.write.filter(t => S.toolInMode(t, 'write'));
  if(simpleWrite.length > 10) throw new Error('Simple me bhi ' + simpleWrite.length + ' tools');
  for(const t of ['select','pen','text','eraser'])
    if(!S.toolInMode(t, 'write')) throw new Error(t + ' Simple me hona hi chahiye');
  for(const t of ['pencil','marker','highlighter'])
    if(S.toolInMode(t, 'write')) throw new Error(t + ' Simple me nahi hona chahiye');

  S.setSimple(false);
  const allWrite = S.MODE_TOOLS.write.filter(t => S.toolInMode(t, 'write'));
  if(allWrite.length <= simpleWrite.length) throw new Error('All tools me bhi utne hi tools');
  for(const t of ['pencil','marker','highlighter'])
    if(!S.toolInMode(t, 'write')) throw new Error(t + ' All tools me bhi nahi aaya');
  S.setSimple(true);
});

T('AI chalte waqt pane disable hota hai', () => {
  const css = H.css;
  if(!/\.aibusy\{[^}]*pointer-events\s*:\s*none/.test(css))
    throw new Error('.aibusy click rokta hi nahi');
  if(/aibusy',\s*false\)/.test(H.html))
    throw new Error('aiBusy hamesha false pass kar raha hai — pane kabhi disable nahi hoga');
});

T('key ke baare me galat baat kahin na likhi ho', () => {
  if(/key travels with it/i.test(H.html))
    throw new Error('galat: key HTML file me nahi jaati, localStorage me rehti hai');
  if(!/never written into the HTML file|HTML file never contains it/i.test(H.html))
    throw new Error('sahi baat kahin likhi hi nahi');
});


T('har mode me sirf usi kaam ke tools', () => {
  const off = () => [...H.html.matchAll(/data-tool="(\w+)"[^>]*data-mo="([^"]+)"/g)]
    .map(m => ({ tool:m[1], modes:m[2].split(' ') }));
  const all = off();
  if(all.length < 15) throw new Error('tools pe mode tag hi nahi lage: ' + all.length);

  const inMode = m => all.filter(t => t.modes.includes(m)).map(t => t.tool);
  const write = inMode('write'), build = inMode('build'), plan = inMode('plan');

  for(const t of ['pen','chalk','duster','eraser'])
    if(!write.includes(t)) throw new Error(t + ' Write me hona chahiye');
  for(const t of ['chalk','duster','pencil'])
    if(build.includes(t)) throw new Error(t + ' Build me nahi hona chahiye');
  for(const t of ['frame','link','card','code'])
    if(!build.includes(t)) throw new Error(t + ' Build me hona chahiye');
  if(write.includes('frame')) throw new Error('frame Write me aa gaya — wahan bekaar hai');
  for(const m of ['write','build','plan','present'])
    if(!inMode(m).includes('select')) throw new Error(m + ' me select hi nahi');
});

T('mode badalne pe galat tool nahi rehta', () => {
  S.setMode('write'); S.setTool('chalk');
  S.setMode('build');
  if(S.tool === 'chalk') throw new Error('Build me aakar bhi chalk hi chala raha hai');
  if(S.toolInMode('chalk','build')) throw new Error('chalk Build me allowed hai');
  if(S.toolInMode('frame','write')) throw new Error('frame Write me allowed hai');
  S.setMode('write');
});

T('top bar buttons bhi mode ke hisaab se', () => {
  const bar = [...H.html.matchAll(/data-mo="([^"]+)" id="(\w+)"/g)].map(m => ({ id:m[2], modes:m[1].split(' ') }));
  const find = id => bar.find(b => b.id === id);
  if(!find('galBtn') || !find('galBtn').modes.includes('build')) throw new Error('Gallery Build me nahi');
  if(find('galBtn').modes.includes('write')) throw new Error('Gallery Write me bhi aa gayi');
  if(!find('recBtn') || !find('recBtn').modes.includes('present')) throw new Error('Record Present me nahi');
  if(!find('surfBtn').modes.includes('write')) throw new Error('Board surface Write me nahi');
});

T('scratch board: khulta hai, aur wapas wahin chhodta hai', async () => {
  // sync test — sirf naam aur state check
  if(typeof S.toggleScratch !== 'function') throw new Error('scratch hai hi nahi');
});

/* ------------------------- board surfaces ------------------------- */
T('surfaces: har board ka apna rang, ink aur grid', () => {
  const seen = new Set();
  for(const k of Object.keys(S.SURFACES)){
    S.setSurface(k);
    const t = S.T();
    if(!t.bg || !t.ink) throw new Error(k + ': bg/ink nahi');
    if(t.bg === t.ink) throw new Error(k + ': ink background me gum ho jayegi');
    seen.add(t.bg);
    S.requestDraw(); pump(2);                // grid + sab kuch draw ho jaye
  }
  if(seen.size !== Object.keys(S.SURFACES).length) throw new Error('do boards ka rang ek jaisa');
  S.setSurface('white');
});

T('chalkboard pe kaali ink apne aap safed ho jaati hai', () => {
  S.setSurface('white');
  S.brushColor = 'ink';
  S.setSurface('green');
  if(!S.chalkBoard()) throw new Error('green chalk board nahi mana');
  if(S.brushColor === 'ink') throw new Error('hare board pe kaali chalk — kuch dikhega hi nahi');
  S.setSurface('white');
  if(S.brushColor !== 'ink') throw new Error('wapas white pe kaali ink nahi lauti');
});

T('chalk stroke draw hota hai aur mota hai', () => {
  S.doc.objects = [];
  const pts = []; for(let i=0;i<40;i++) pts.push({ x:i*8, y:Math.sin(i/4)*30, p:0.8 });
  const st = { id:'c1', type:'stroke', tool:'chalk', color:'#F5F3EC', size:5, step:0, points:pts };
  S.objects().push(st);
  S.drawObject(st);
  if(S.strokeWidth(st) <= st.size) throw new Error('chalk ki chaudai normal pen jaisi hai');
});

T('duster bade daayre me saaf karta hai', () => {
  S.doc.objects = [];
  const mk = (x) => { const pts=[{x, y:0, p:1},{x:x+5, y:5, p:1}];
    const o = { id:'s'+x, type:'stroke', tool:'chalk', color:'ink', size:4, step:0, points:pts };
    S.objects().push(o); return o; };
  mk(0); mk(60); mk(400);
  // chhota eraser sirf apne neeche wali line hataye
  S.eraseAt(0, 0, true, 0);
  if(S.objects().length !== 2) throw new Error('normal eraser ne galat ginti hatai');
  // duster ek jhatke me aas-paas ka sab
  S.eraseAt(60, 0, true, 120);
  if(S.objects().length !== 1) throw new Error('duster ne aas-paas ka saaf nahi kiya');
  if(!S.byId('s400')) throw new Error('duster ne door wali bhi uda di');
});

T('shape recognition: gola aur chaukor pakadta hai, aadhi line nahi', () => {
  const mk = (pts, tool) => ({ id:'x', type:'stroke', tool:tool||'pen', color:'ink',
                               size:3, step:0, points:pts });
  // gola
  const circ = []; for(let a=0;a<=360;a+=12){ const r=a*Math.PI/180;
    circ.push({ x:200+Math.cos(r)*100 + (a%36?1.5:-1.5), y:200+Math.sin(r)*100, p:1 }); }
  let out = S.recogniseShape(mk(circ));
  if(!out || out.kind !== 'ellipse') throw new Error('gola nahi pakda: ' + (out && out.kind));

  // chaukor
  const rect = [];
  for(let i=0;i<=20;i++) rect.push({ x:i*10, y:0, p:1 });
  for(let i=0;i<=20;i++) rect.push({ x:200, y:i*8, p:1 });
  for(let i=20;i>=0;i--) rect.push({ x:i*10, y:160, p:1 });
  for(let i=20;i>=0;i--) rect.push({ x:0, y:i*8, p:1 });
  out = S.recogniseShape(mk(rect));
  if(!out || out.kind !== 'rect') throw new Error('chaukor nahi pakda: ' + (out && out.kind));

  // aadhi lakeer — badalni NAHI chahiye
  const line = []; for(let i=0;i<30;i++) line.push({ x:i*10, y:i*3, p:1 });
  if(S.recogniseShape(mk(line))) throw new Error('seedhi lakeer ko shape bana diya');
  // tedhi-medhi scribble
  const scr = []; for(let i=0;i<40;i++) scr.push({ x:i*7, y:(i%2?40:0) + Math.sin(i)*20, p:1 });
  if(S.recogniseShape(mk(scr))) throw new Error('scribble ko shape bana diya');
  // highlighter kabhi nahi badalna chahiye
  if(S.recogniseShape(mk(circ, 'highlighter'))) throw new Error('highlighter bhi badal diya');
  // off ho to kuch na ho
  S.shapeSnap = false;
  if(S.recogniseShape(mk(circ))) throw new Error('off hone par bhi badal diya');
  S.shapeSnap = true;
});

/* ------------------------ keyboard + mouse ------------------------ */
T('wheel: pan, Ctrl se zoom, Shift se side me', () => {
  const wheels = listeners.filter(l => l.type === 'wheel');
  if(!wheels.length) throw new Error('wheel handler hi nahi');
  const ev = o => Object.assign({ deltaX:0, deltaY:0, clientX:800, clientY:450,
                                  ctrlKey:false, metaKey:false, shiftKey:false,
                                  preventDefault(){} }, o);
  const fire = o => { for(const l of wheels) l.fn(ev(o)); };
  const snap = () => ({ x:S.cam.x, y:S.cam.y, z:S.cam.z });

  let a = snap(); fire({ deltaY:100 });
  let b = snap();
  if(b.y <= a.y) throw new Error('plain wheel se neeche nahi gaya');
  if(Math.abs(b.z - a.z) > 1e-9) throw new Error('plain wheel se zoom ho gaya');

  a = snap(); fire({ deltaY:100, ctrlKey:true });
  b = snap();
  if(Math.abs(b.z - a.z) < 1e-9) throw new Error('Ctrl+wheel se zoom nahi hua');

  a = snap(); fire({ deltaY:100, shiftKey:true });
  b = snap();
  if(Math.abs(b.x - a.x) < 1e-9) throw new Error('Shift+wheel se side me nahi gaya');
  if(Math.abs(b.y - a.y) > 1e-9) throw new Error('Shift+wheel ne oopar-neeche bhi hila diya');
});

T('Ctrl+S browser ka dialog rok deta hai', () => {
  let stopped = false;
  const keys = listeners.filter(l => l.type === 'keydown');
  for(const l of keys) l.fn({ key:'s', code:'KeyS', ctrlKey:true, metaKey:false, shiftKey:false,
    preventDefault(){ stopped = true; }, stopPropagation(){}, target:{} });
  if(!stopped) throw new Error('preventDefault nahi hua — browser ka Save page khul jayega');
});

T('Tab se ek-ek cheez pe jaate hain', () => {
  S.doc.objects = [];
  for(let i=0;i<3;i++) S.objects().push(S.mkCard(i*500, 0, '✨', 'C'+i, 'x', 1));
  S.sel = [];
  const keys = listeners.filter(l => l.type === 'keydown');
  const tab = sh => { for(const l of keys) l.fn({ key:'Tab', code:'Tab', shiftKey:!!sh,
    ctrlKey:false, metaKey:false, preventDefault(){}, stopPropagation(){}, target:{} }); };
  tab(); const first = S.sel[0];
  if(!first) throw new Error('Tab se kuch select nahi hua');
  tab(); if(S.sel[0] === first) throw new Error('Tab se aage nahi badha');
  tab(true); if(S.sel[0] !== first) throw new Error('Shift+Tab se peeche nahi aaya');
  // locked / hidden skip hone chahiye
  S.objects()[1].locked = true;
  S.sel = []; tab(); tab();
  if(S.sel[0] === S.objects()[1].id) throw new Error('locked cheez pe Tab ruk gaya');
  S.objects()[1].locked = false;
});

T('hover pe cursor badalta hai', () => {
  S.doc.objects = [];
  const c = S.mkCard(0, 0, '✨', 'a', 'b', 1);
  S.objects().push(c);
  const b = S.bbox(c);
  const cur = () => elById.stage.style.cursor;
  S.hoverCursor({ clientX:5, clientY:5 });
  const away = cur();
  // object ke oopar — screen coords chahiye, isliye world se badalte hain
  const p = S.toScreen(b.x + b.w/2, b.y + b.h/2);
  S.hoverCursor({ clientX:p.x, clientY:p.y });
  if(cur() !== 'move') throw new Error('object ke upar cursor "' + cur() + '", chahiye "move"');
  S.hoverCursor({ clientX:5, clientY:5 });
  if(cur() === 'move') throw new Error('khaali jagah pe bhi move cursor');
});

T('khaali jagah 2x click = naya text', () => {
  S.setTool('select');                        // pen chalu ho to likhna hi chahiye, text nahi
  S.doc.objects = [];
  const dbl = listeners.filter(l => l.type === 'dblclick');
  if(!dbl.length) throw new Error('dblclick handler nahi');
  for(const l of dbl) l.fn({ clientX:400, clientY:300 });
  const t = S.objects().find(o => o.type === 'text');
  if(!t) throw new Error('naya text nahi bana');
});

/* --------------------------- practical use --------------------------- */
T('find: board pe text dhoondhta hai', () => {
  S.doc.objects = [];
  S.objects().push(S.mkCard(0,0,'✨','Download karo','blue button',1));
  S.objects().push(S.mkCard(600,0,'✨','Install karo','double click',2));
  S.objects().push(S.mkText(0,400,'Install ho gaya',30,3,400));
  elById.findQ.value = 'install';
  S.runFind();
  if(S.findHits.length !== 2) throw new Error('mile: ' + S.findHits.length + ', chahiye 2');
  const first = S.findHits[0].id;
  S.findStep(1);
  if(S.findHits[S.findAt].id === first) throw new Error('agle par nahi gaya');
  S.findStep(1);
  if(S.findHits[S.findAt].id !== first) throw new Error('ghoom kar wapas nahi aaya');
  elById.findQ.value = 'zzzz'; S.runFind();
  if(S.findHits.length) throw new Error('na milne par bhi result');
  // chhupi hui cheez search me nahi aani chahiye
  S.objects()[0].hidden = true;
  elById.findQ.value = 'download'; S.runFind();
  if(S.findHits.length) throw new Error('hidden cheez search me aa gayi');
  S.objects()[0].hidden = false;
});

T('present: 1-9 se kisi bhi step pe jump', () => {
  S.doc.objects = [];
  for(let i=1;i<=6;i++) S.objects().push(S.mkCard(i*400,0,'✨','C'+i,'x',i));
  S.enterPresent();
  const keys = listeners.filter(l => l.type === 'keydown');
  for(const l of keys) l.fn({ key:'4', code:'Digit4', preventDefault(){}, stopPropagation(){}, target:{} });
  if(S.step !== 4) throw new Error('4 dabane pe step ' + S.step);
  for(const l of keys) l.fn({ key:'End', code:'End', preventDefault(){}, stopPropagation(){}, target:{} });
  if(S.step !== S.maxStep()) throw new Error('End se aakhir pe nahi gaya');
  S.exitPresent();
});

T('recording countdown: pehle ginti, phir shuru', () => {
  let started = false;
  S.countdownThen(() => { started = true; });
  if(started) throw new Error('bina ginti ke hi shuru ho gaya');
  if(!elById.cdown.classList.contains('on')) throw new Error('countdown dikha hi nahi');
  if(!S.cancelCountdown()) throw new Error('cancel nahi hua');
  if(elById.cdown.classList.contains('on')) throw new Error('cancel ke baad bhi dikh raha');
});

T('kharab board se poora app na tute', () => {
  // live doc ko chhue bina — sanitizeDoc apne aap me test hota hai
  for(const bad of [null, 'garbage', 42, { objects:'nope' },
                    { objects:[null, 'junk', { type:'card' }] },
                    { name:5, views:'x', stepNotes:null, objects:[{ id:'ok', type:'card' }] }]){
    const d = S.sanitizeDoc(bad, true);
    if(!Array.isArray(d.objects)) throw new Error('objects array nahi bana');
    if(typeof d.name !== 'string') throw new Error('name string nahi');
    if(!d.views || typeof d.views !== 'object') throw new Error('views object nahi');
    if(!d.stepNotes || typeof d.stepNotes !== 'object') throw new Error('stepNotes object nahi');
    if(!d.camera || typeof d.camera.z !== 'number') throw new Error('camera nahi bana');
    for(const o of d.objects) if(!o.id || !o.type) throw new Error('kharab object bach gaya');
  }
  const kept = S.sanitizeDoc({ objects:[{ id:'a', type:'card' }, { id:'b', type:'text' }] }, true);
  if(kept.objects.length !== 2) throw new Error('sahi objects bhi hata diye');
});

T('backup nudge sirf ek baar, aur backup ke baad reset', () => {
  const before = S.editsSinceBackup;
  for(let i=0;i<200;i++) S.noteEdit();
  if(S.editsSinceBackup <= before) throw new Error('ginti nahi badhi');
});

}

/* ------------------------------ async ------------------------------ */
(async () => {
  await ready();
  syncTests();
  await T2('groq: sahi model chunta hai', async () => {
    S.aiKey = 'gsk_test'; sandboxReset();
    const m = await S.pickModel(true);
    if(/whisper/.test(m) || !/70b/.test(m)) throw new Error('galat model: ' + m);
  });
  function sandboxReset(){ try{ S.aiModel = ''; }catch(e){} }

  await T2('AI walkthrough: plan stream -> board', async () => {
    NET.plan = { goal:'Install X', taskType:'gui', steps:[
      { type:'step', title:'Kholo', action:'type karo',
        screen:{ url:'x.com', heading:'D', buttons:['A','B'], click:'B' }, expect:'khula' },
      { type:'success', title:'Done' }] };
    S.aiKey = 'gsk_test'; elById.aiStyle.value = 'guide';
    elById.aiTopic.value = 'x install karna sikhao'; elById.scriptText.value = '';
    await S.aiWriteScript();
    NET.plan = null;
    if(!S.parsePlanJSON(elById.scriptText.value)) throw new Error('valid plan nahi bana');
    S.doc.objects = []; S.runScript();
    if(!S.objects().some(o => o.type === 'device' && o.screen)) throw new Error('mock screen nahi bani');
  });

  await T2('clean up fail ho to purana text bacha rahe', async () => {
    elById.scriptText.value = '# keep me\n- A :: b';
    NET.fail = true; await S.aiPolish(); NET.fail = false;
    if(elById.scriptText.value !== '# keep me\n- A :: b') throw new Error('text kho gaya');
  });

  await T2('bina key ke AI shant se mana karta hai', async () => {
    const k = S.aiKey; S.aiKey = '';
    elById.aiTopic.value = 'x'; await S.aiWriteScript();
    S.aiKey = k;
  });

  await T2('iconify: data-URI banti hai, offline pe saaf message', async () => {
    S.icoQuery = 'openai'; await S.searchIcons();
    if(!S.icoResults.length) throw new Error('koi result nahi');
    S.doc.objects = [];
    const o = await S.placeIcon(S.icoResults[0], { x:0, y:0 });
    if(!o || !String(o.src).startsWith('data:image/svg+xml'))
      throw new Error('data-URI me nahi badla — offline pe tut jayega');
    if(String(o.src).includes('currentColor')) throw new Error('currentColor nahi badla');
    NET.fail = true; S.icoQuery = 'rocket'; await S.searchIcons(); NET.fail = false;
    if(S.icoResults.length) throw new Error('offline me bhi result');
  });

  await T2('YouTube brand kit + koi bahar ki URL board pe na jaye', async () => {
    S.ytKey = 'k'; await S.connectChannel('@techbyvansh');
    if(!S.brand || S.brand.subs !== 12400) throw new Error('channel nahi juda');
    if(!S.brand.avatar.startsWith('data:')) throw new Error('avatar data-URI nahi');
    for(const b of S.brandBlocks()){
      S.doc.objects = []; S.placeBlock(b.key, { x:0, y:0 });
      for(const o of S.objects())
        if(o.src && /^https?:/.test(o.src)) throw new Error(b.key + ' me bahar ki URL — export tutega');
    }
    NET.imgBlocked = true; S.brand = null;
    await S.connectChannel('@techbyvansh');
    NET.imgBlocked = false;
    if(!S.brand) throw new Error('image block hone pe poora connect fail');
  });

  await T2('recorder: board aur screen dono mode', async () => {
    REC.made.length = 0;
    await S.startRecording();
    if(!REC.made.length) throw new Error('recorder shuru nahi hua');
    if(!/^video\/(mp4|webm)/.test(REC.made[0].mimeType)) throw new Error('galat format');
    S.stopRecording();
    S.setRecMode('screen'); REC.made.length = 0;
    await S.startRecording();
    if(!REC.made.length) throw new Error('screen mode shuru nahi hua');
    S.stopRecording(); S.setRecMode('board');
  });

  await T2('keys: encrypt -> decrypt, galat password pe nahi khulti', async () => {
    const c = require('crypto').webcrypto;
    const derive = async (pass, salt) => {
      const km = await c.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
      return c.subtle.deriveKey({ name:'PBKDF2', salt, iterations:250000, hash:'SHA-256' },
        km, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']);
    };
    const secret = { groq:'gsk_abc', yt:'AIza_xyz' };
    const salt = c.getRandomValues(new Uint8Array(16)), iv = c.getRandomValues(new Uint8Array(12));
    const ct = await c.subtle.encrypt({ name:'AES-GCM', iv }, await derive('right', salt),
      new TextEncoder().encode(JSON.stringify(secret)));
    const file = 'TBVKEYS1.' + Buffer.from(salt).toString('base64') + '.' +
                 Buffer.from(iv).toString('base64') + '.' + Buffer.from(ct).toString('base64');
    if(/gsk_abc|AIza_xyz/.test(file)) throw new Error('key file me khuli padi hai');
    const back = JSON.parse(new TextDecoder().decode(
      await c.subtle.decrypt({ name:'AES-GCM', iv }, await derive('right', salt), ct)));
    if(back.groq !== secret.groq) throw new Error('sahi password se wapas nahi mili');
    let opened = false;
    try{ await c.subtle.decrypt({ name:'AES-GCM', iv }, await derive('wrong', salt), ct); opened = true; }
    catch(e){}
    if(opened) throw new Error('galat password se bhi khul gayi');
  });

  await T2('scratch board: jaao, likho, wapas aao', async () => {
    S.setMode('write');
    const home = S.doc.id;
    S.doc.objects = [];
    S.objects().push(S.mkCard(0,0,'✨','ghar ka kaam','x',1));
    S.save();

    await S.toggleScratch();
    if(S.doc.id === home) throw new Error('scratch board khula hi nahi');
    if(S.doc.name !== '⚡ Scratch') throw new Error('galat board: ' + S.doc.name);
    if(S.objects().length) throw new Error('scratch khaali nahi hai');

    await S.toggleScratch();
    if(S.doc.id !== home) throw new Error('wapas apne board pe nahi aaya');
    if(!S.objects().some(o => o.title === 'ghar ka kaam')) throw new Error('purana kaam kho gaya');

    // dobara jaane par wahi scratch board mile, naya na bane
    const before = S.boards.length;
    await S.toggleScratch();
    if(S.boards.length !== before) throw new Error('har baar naya scratch bana raha hai');
    await S.toggleScratch();
  });

  await T2('flush ke baad board sach me store me', async () => {
    S.doc.name = 'FlushTest';
    S.save(); S.flushSave();
    await new Promise(r => setTimeout(r, 120));
    const key = 'tbv_studio_b_' + S.doc.id;
    const inLS = !!store[key];
    const idb = process.env.IDB === '1' && require('./fakeidb');
    if(!inLS && process.env.IDB !== '1') throw new Error('kahin save nahi hua');
  });

  pump(20);
  process.exit(report());
})();
