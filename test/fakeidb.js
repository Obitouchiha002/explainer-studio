/* Chhota nakli IndexedDB — sirf utna jitna app use karta hai.
   Maqsad: IDB wala rasta (jo asli browser me default hai) sach me chalake dekhna. */
function makeFakeIDB(){
  const data = new Map();
  const meta = { version:0, stores:new Set() };

  function makeStore(name){
    if(!data.has(name)) data.set(name, new Map());
    const bag = data.get(name);
    return {
      get(k){ const rq = {}; setTimeout(() => {
        rq.result = bag.has(k) ? JSON.parse(JSON.stringify(bag.get(k))) : undefined; }, 0); return rq; },
      put(v, k){ const rq = {}; setTimeout(() => {
        bag.set(k, JSON.parse(JSON.stringify(v))); rq.result = k; }, 0); return rq; },
      delete(k){ const rq = {}; setTimeout(() => { bag.delete(k); }, 0); return rq; },
    };
  }

  const dbObj = {
    objectStoreNames:{ contains:n => meta.stores.has(n) },
    createObjectStore(n){ meta.stores.add(n); data.set(n, new Map()); return makeStore(n); },
    transaction(name){
      const tx = {};
      setTimeout(() => setTimeout(() => { if(tx.oncomplete) tx.oncomplete(); }, 0), 0);
      return Object.assign(tx, { objectStore:() => makeStore(name) });
    },
  };

  return {
    open(name, version){
      const rq = {};
      setTimeout(() => {
        rq.result = dbObj;
        if(version > meta.version){ meta.version = version; if(rq.onupgradeneeded) rq.onupgradeneeded(); }
        setTimeout(() => { if(rq.onsuccess) rq.onsuccess(); }, 0);
      }, 0);
      return rq;
    },
    _dump:() => data,
  };
}
module.exports = { makeFakeIDB };
