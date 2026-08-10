/* Test harness — ab repo ke andar, taaki dobara na khoye.
   Ek chhota DOM stub jisme app poori load hoti hai. Rendering ka sach nahi
   batata (CSS nahi lagta), par logic, wiring aur data-integrity pakadta hai.

   chalao:  node test/harness.js            (localStorage fallback)
            IDB=1 node test/harness.js      (IndexedDB rasta)
            APP=path node test/harness.js   (kisi aur build pe)                */
const fs = require('fs'), vm = require('vm'), path = require('path');

const APP = process.env.APP || path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(APP, 'utf8');

// top-level `let` vm context pe expose nahi hote — accessor bridge jodte hain
const BRIDGE = `
;globalThis.__T = {
  get doc(){return doc}, get boards(){return boards}, set boards(v){boards=v},
  get sel(){return sel}, set sel(v){sel=v},
  get present(){return present}, get step(){return step},
  get theme(){return theme}, set theme(v){theme=v},
  get cropping(){return cropping}, get revealState(){return revealState},
  get imgCache(){return imgCache}, get W(){return W}, get dpr(){return dpr},
  get cam(){return cam}, get gridKey(){return gridKey}, set gridKey(v){gridKey=v},
  get frameMode(){return frameMode}, set frameMode(v){frameMode=v},
  get qLevel(){return qLevel}, get DPR_CAP(){return DPR_CAP},
  get defaultAnim(){return defaultAnim}, set defaultAnim(v){defaultAnim=v},
  get animStagger(){return animStagger}, set animStagger(v){animStagger=v},
  get aiKey(){return aiKey}, set aiKey(v){aiKey=v},
  get ytKey(){return ytKey}, set ytKey(v){ytKey=v},
  get brand(){return brand}, set brand(v){brand=v},
  get galQuery(){return galQuery}, set galQuery(v){galQuery=v},
  get galFilter(){return galFilter}, set galFilter(v){galFilter=v},
  get GALLERY(){return GALLERY}, get BRANDS(){return BRANDS},
  get ANIM_CARDS(){return ANIM_CARDS}, get ANIMS(){return ANIMS},
  get SCRIPT_SAMPLE(){return SCRIPT_SAMPLE},
  get showTip(){return showTip}, get icoResults(){return icoResults},
  get icoQuery(){return icoQuery}, set icoQuery(v){icoQuery=v},
  get recAspect(){return recAspect}, set recAspect(v){recAspect=v},
  get aiModel(){return aiModel}, set aiModel(v){aiModel=v},
  get animMs(){return animMs}, set animMs(v){animMs=v},
  get snapOn(){return snapOn}, set snapOn(v){snapOn=v},
  get showGrid(){return showGrid}, set showGrid(v){showGrid=v},
  get livePath(){return livePath}, get mode(){return mode},
  get bootDone(){return bootDone},
  get SURFACES(){return SURFACES}, get surface(){return surface},
  get T(){return T},
  get tool(){return tool}, get uiMode(){return uiMode},
  get MODE_TOOLS(){return MODE_TOOLS},
  get simpleUI(){return simpleUI},
  get openStart(){return openStart}, get doneStart(){return doneStart},
  get scratchFrom(){return scratchFrom},
  get brushColor(){return brushColor}, set brushColor(v){brushColor=v},
  get shapeSnap(){return shapeSnap}, set shapeSnap(v){shapeSnap=v},
  get wheelMode(){return wheelMode}, set wheelMode(v){wheelMode=v},
  get findHits(){return findHits}, get findAt(){return findAt},
  get editsSinceBackup(){return editsSinceBackup},
  set doc(v){doc=v},
};`;
const script = html.match(/<script>\n([\s\S]*?)\n<\/script>/)[1] + BRIDGE;
const css = html.split('<style>')[1].split('</style>')[0];
const ids = [...html.matchAll(/id="([\w-]+)"/g)].map(m => m[1]);

/* ------------------------------ DOM stub ------------------------------ */
const listeners = [];

function mkCtx(){
  const noop = () => {};
  const ops = [];
  const rec = (...a) => ops.push(a.join('|'));
  const c = new Proxy({
    __ops: ops,
    measureText: () => ({ width: 42 }),
    createPattern: () => ({}),
    createLinearGradient: () => ({ addColorStop(){} }),
    createRadialGradient: () => ({ addColorStop(){} }),
    // browser ki tarah negative radius pe error — ulta drag wala bug pakadne ke liye
    arcTo(x1,y1,x2,y2,r){ if(!(r >= 0)) throw new Error('IndexSizeError: arcTo radius ' + r); },
    arc(x,y,r){ if(!(r >= 0)) throw new Error('IndexSizeError: arc radius ' + r); },
    ellipse(x,y,rx,ry){ if(!(rx >= 0 && ry >= 0)) throw new Error('IndexSizeError: ellipse radii'); },
    fill(){ rec('fill', c.fillStyle, c.globalAlpha); },
    stroke(){ rec('stroke', c.strokeStyle); },
    fillRect(x,y,w,h){ rec('fillRect', c.fillStyle, x, y, w, h); },
    fillText(t,x,y){ rec('text', c.font, t, Math.round(x), Math.round(y)); },
    drawImage(){ rec('img'); },
  }, { get:(t,k) => (k in t ? t[k] : noop), set:(t,k,v) => { t[k] = v; return true; } });
  return c;
}

function mkEl(tag, id){
  const el = {
    tagName:(tag||'div').toUpperCase(), id:id||'', value:'', textContent:'',
    _html:'', disabled:false, width:800, height:600, naturalWidth:800, naturalHeight:600,
    complete:true, files:[], dataset:{}, children:[], offsetWidth:0, offsetHeight:0,
    style:new Proxy({}, { get:(t,k)=>t[k]||'', set:(t,k,v)=>{t[k]=v;return true;} }),
    classList:{ _s:new Set(),
      add(...c){c.forEach(x=>this._s.add(x));}, remove(...c){c.forEach(x=>this._s.delete(x));},
      toggle(c,f){const on=f===undefined?!this._s.has(c):!!f; on?this._s.add(c):this._s.delete(c); return on;},
      contains(c){return this._s.has(c);} },
    addEventListener(type,fn){ listeners.push({el,type,fn}); },
    removeEventListener(){}, dispatchEvent(){return true;},
    appendChild(e){ this.children.push(e); e.parentNode = this; },
    insertBefore(e){ this.children.push(e); e.parentNode = this; },
    setAttribute(){}, getAttribute(){return null;}, removeAttribute(){},
    remove(){}, click(){}, focus(){}, select(){},
    setPointerCapture(){}, releasePointerCapture(){},
    getBoundingClientRect:()=>({left:10,top:10,right:110,bottom:60,width:100,height:50}),
    closest(){return null;}, querySelector(){return mkEl('div');}, querySelectorAll(){return [];},
    get innerHTML(){ return el._html; },
    set innerHTML(v){ el._html = v; if(v === '') el.children = []; },
    getContext(){ if(!el.__ctx){ el.__ctx = mkCtx(); el.__ctx.canvas = el; } return el.__ctx; },
    toBlob(cb){ cb({size:10}); },
    captureStream(){ return { _t:[], addTrack(t){this._t.push(t);}, getTracks(){return this._t;} }; },
    toDataURL(){
      const ops = (el.__ctx && el.__ctx.__ops) || [];
      if(!ops.length) return '';
      let h = 5381;
      for(const o of ops) for(let i=0;i<o.length;i++) h = ((h*33) ^ o.charCodeAt(i)) >>> 0;
      return 'data:image/png;base64,' + h.toString(36) + '_' + el.width + 'x' + el.height + '_' + 'A'.repeat(50);
    },
  };
  return el;
}

const elById = {};
for(const id of ids) elById[id] = mkEl('div', id);
for(const [id, tag] of [['editor','TEXTAREA'],['boardName','INPUT'],['pSecs','INPUT'],
                        ['sizeRange','INPUT'],['scriptText','TEXTAREA'],['aiTopic','TEXTAREA'],
                        ['aiStyle','SELECT'],['aiKey','INPUT']])
  if(elById[id]) elById[id].tagName = tag;
if(elById.pSecs) elById.pSecs.value = '6';
if(elById.sizeRange) elById.sizeRange.value = '4';
if(elById.aiStyle) elById.aiStyle.value = 'guide';

// top bar — chaudai control me, taaki responsive logic test ho sake
const topBar = mkEl('div');
topBar._kids = [];
topBar.clientWidth = 1400;
topBar.querySelectorAll = q => /data-pri/.test(q) ? topBar._kids.filter(k => k.parentNode === topBar) : [];
topBar.insertBefore = el => { el.parentNode = topBar; };
Object.defineProperty(topBar, 'scrollWidth', {
  get(){ const inBar = topBar._kids.filter(k => k.parentNode === topBar);
         return 320 + inBar.reduce((s, k) => s + (topBar.classList.contains('tight') ? 46 : (k._w || 110)), 0); },
  configurable:true });

const document = {
  documentElement: mkEl('html'), body: mkEl('body'),
  activeElement:null, fullscreenElement:null,
  fonts:{ ready:Promise.resolve(), check:()=>true },
  getElementById: id => elById[id] || null,
  createElement: tag => mkEl(tag),
  querySelector: sel => sel === '.top' ? topBar : mkEl('div'),
  querySelectorAll: sel => /data-tool|data-ptool|\.tool|\.sw|\.pop|data-mode|data-atab/.test(sel)
                           ? [mkEl('button'), mkEl('button')] : [],
  addEventListener(type,fn){ listeners.push({el:document,type,fn}); },
  removeEventListener(){}, exitFullscreen(){},
};
document.documentElement.requestFullscreen = () => {};

const store = {};
const localStorage = {
  getItem:k => (k in store ? store[k] : null),
  setItem:(k,v) => { store[k] = String(v); },
  removeItem:k => { delete store[k]; },
};

/* ---------------------------- fake network ---------------------------- */
const NET = { fail:false, calls:[], ytErr:false, imgBlocked:false, plan:null };
function sse(chunks){
  let i = 0;
  return { getReader(){ return { read(){
    if(i >= chunks.length) return Promise.resolve({ done:true });
    // asli fetch stream Uint8Array deta hai, string nahi — TextDecoder isi pe chalta hai
    const line = 'data: ' + JSON.stringify({ choices:[{ delta:{ content:chunks[i++] } }] }) + '\n\n';
    return Promise.resolve({ done:false, value:new TextEncoder().encode(line) });
  } }; } };
}
function fetch(url){
  NET.calls.push(url);
  if(NET.fail) return Promise.reject(new Error('offline'));
  if(url.includes('/models'))
    return Promise.resolve({ ok:true, json:async()=>({ data:[{id:'whisper-large-v3'},
      {id:'llama-3.3-70b-versatile'},{id:'llama-3.1-8b-instant'}] }) });
  if(url.includes('/chat/completions')){
    if(NET.plan){ const j = JSON.stringify(NET.plan), p = [];
      for(let i=0;i<j.length;i+=40) p.push(j.slice(i,i+40));
      return Promise.resolve({ ok:true, body:sse(p) }); }
    return Promise.resolve({ ok:true, body:sse(['# Test slide\n','- 🚀 One :: first\n',': say this\n']) });
  }
  if(url.includes('youtube/v3/channels'))
    return Promise.resolve({ ok:true, json:async()=> NET.ytErr ? { error:{message:'bad key'} } : { items:[{
      id:'UC1', snippet:{ title:'Tech by Vansh', thumbnails:{ high:{ url:'https://yt3.ggpht.com/a.jpg' } } },
      statistics:{ subscriberCount:'12400' },
      contentDetails:{ relatedPlaylists:{ uploads:'UU1' } } }] } });
  if(url.includes('youtube/v3/playlistItems'))
    return Promise.resolve({ ok:true, json:async()=>({ items:[
      { snippet:{ title:'Vibe coding', thumbnails:{ high:{ url:'https://i.ytimg.com/a.jpg' } } } }] }) });
  if(/ytimg|ggpht|googleusercontent/.test(url)){
    if(NET.imgBlocked) return Promise.reject(new Error('CORS'));
    return Promise.resolve({ ok:true, blob:async()=>({__img:true}) });
  }
  if(url.includes('iconify.design/search'))
    return Promise.resolve({ ok:true, json:async()=>({ icons:['simple-icons:openai','mdi:rocket'] }) });
  if(url.includes('iconify.design/'))
    return Promise.resolve({ ok:true, text:async()=>'<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>' });
  return Promise.resolve({ ok:false, status:404, json:async()=>({}) });
}

const REC = { made:[], micDenied:false, supported:['video/mp4','video/webm'] };
class MediaRecorder {
  static isTypeSupported(m){ return REC.supported.includes(m); }
  constructor(stream, opt){ this.stream = stream; this.mimeType = opt.mimeType;
                            this.state = 'inactive'; REC.made.push(this); }
  start(){ this.state = 'recording';
           setTimeout(()=>this.ondataavailable&&this.ondataavailable({data:{size:2048}}),0); }
  stop(){ this.state = 'inactive'; setTimeout(()=>this.onstop&&this.onstop(),0); }
}
const navMedia = {
  getUserMedia: () => REC.micDenied ? Promise.reject(new Error('denied'))
    : Promise.resolve({ getAudioTracks:()=>[{kind:'audio'}], getTracks:()=>[{stop(){}}] }),
  getDisplayMedia: () => Promise.resolve({
    getAudioTracks:()=>[], getVideoTracks:()=>[{addEventListener(){}}],
    getTracks:()=>[{stop(){}}], addTrack(){} }),
};

const rafQueue = [];
function requestAnimationFrame(fn){ if(rafQueue.length < 400) rafQueue.push(fn); return rafQueue.length; }
const performance = { now: () => Date.now() };
function matchMedia(){ return { matches:false }; }
class Image { constructor(){ this.complete=true; this.naturalWidth=100; this.naturalHeight=100; }
  set src(v){ this._s=v; if(this.onload) setTimeout(()=>this.onload(),0); } get src(){ return this._s; } }
class FileReader {
  readAsDataURL(){ this.result='data:image/png;base64,AAA'; setTimeout(()=>this.onload&&this.onload(),0); }
  readAsText(){ this.result='{}'; setTimeout(()=>this.onload&&this.onload(),0); } }
class Blob { constructor(p){ this.parts=p; } }
const URL = { createObjectURL:()=>'blob:x', revokeObjectURL:()=>{} };
const { webcrypto } = require('crypto');
let CONFIRM_SAYS = true, LAST_CONFIRM = '';
const window = {
  innerWidth:1600, innerHeight:900, devicePixelRatio:2,
  addEventListener(type,fn){ listeners.push({el:window,type,fn}); },
  get indexedDB(){ return indexedDB; },
  get MediaRecorder(){ return MediaRecorder; },
  get crypto(){ return webcrypto; },
  matchMedia:()=>({matches:false}), location:{href:'file:///x.html', protocol:'file:'},
};
const { makeFakeIDB } = require('./fakeidb');
const indexedDB = process.env.IDB === '1' ? makeFakeIDB() : undefined;

const sandbox = {
  document, window, localStorage, requestAnimationFrame, performance, matchMedia,
  Image, FileReader, Blob, URL, navigator:{ userAgent:'node', hardwareConcurrency:4,
    deviceMemory:4, get mediaDevices(){ return navMedia; } },
  confirm:(m)=>{ LAST_CONFIRM=m; return CONFIRM_SAYS; }, alert:()=>{}, prompt:()=>null,
  indexedDB, fetch, MediaRecorder, TextEncoder, TextDecoder, AbortController,
  crypto: webcrypto, btoa, atob, setTimeout, clearTimeout, setInterval, clearInterval, console,
  Math, JSON, Map, Set, WeakMap, Number, String, Array, Object, Promise, Error, RegExp,
  isFinite, parseInt, parseFloat, Date, Uint8Array, Boolean,
};
vm.createContext(sandbox);

/* ------------------------------- runner ------------------------------- */
const checks = [];
function T(name, fn){
  try{ fn(); checks.push(['ok', name]); }
  catch(e){ checks.push(['bad', name, e.message, e.stack]); }
}
async function T2(name, fn){
  try{ await fn(); checks.push(['ok', name]); }
  catch(e){ checks.push(['bad', name, e.message, e.stack]); }
}
function pump(n){ let i=0; while(rafQueue.length && i<n){ rafQueue.shift()(performance.now()); i++; } }

try{
  vm.runInContext(script, sandbox, { filename:'app.js' });
}catch(e){
  console.log('✗ LOAD ERROR:', e.message);
  console.log(e.stack.split('\n').slice(0,5).join('\n'));
  process.exit(1);
}
pump(12);

const S = new Proxy(sandbox, {
  get(t,k){ return (sandbox.__T && k in sandbox.__T) ? sandbox.__T[k] : t[k]; },
  set(t,k,v){ if(sandbox.__T && k in sandbox.__T){ sandbox.__T[k]=v; return true; } t[k]=v; return true; }
});

/* Boot async hai (IndexedDB). Tests usse pehle chal jaate the aur doc null milta
   tha — isliye ek ready() hai jo board banne ka intezaar karta hai. */
function ready(){
  return new Promise(res => {
    let n = 0;
    const tick = () => {
      pump(4);
      // sirf `doc` kaafi nahi — boot ke baad wale async kaam (brand kit, assets)
      // baad me state overwrite kar dete the aur tests flaky ho jaate the
      if((sandbox.__T && sandbox.__T.bootDone) || ++n > 300) return res();
      setTimeout(tick, 5);
    };
    tick();
  });
}

module.exports = { S, T, T2, pump, ready, elById, listeners, store, NET, REC, topBar,
                   mkEl, css, html, sandbox, document,
                   get CONFIRM_SAYS(){ return CONFIRM_SAYS; },
                   setConfirm(v){ CONFIRM_SAYS = v; },
                   lastConfirm(){ return LAST_CONFIRM; },
                   report(){
                     console.log(checks.map(c => c[0]==='ok' ? '  ✓ '+c[1]
       : '  ✗ '+c[1]+' → '+c[2] + (process.env.STACK && c[3]
           ? '\n      ' + String(c[3]).split('\n').slice(1,4).join('\n      ') : '')).join('\n'));
                     const bad = checks.filter(c => c[0]==='bad');
                     console.log(bad.length ? `\n${bad.length} FAIL` : `\n${checks.length}/${checks.length} pass ✓`);
                     return bad.length;
                   } };
