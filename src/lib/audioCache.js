// Persistent audio cache for synthesised speech.
//
// Playing a word should be instant on the second time, and re-synthesising
// the same word repeatedly costs money on a cloud provider. This stores the
// generated audio in IndexedDB keyed by (provider, voice, text, rate) so each
// word is only ever generated once per device.

const DB_NAME = "ks2-audio";
const STORE = "clips";
const MAX_ENTRIES = 400;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        let result;
        try {
          result = fn(store);
        } catch (err) {
          reject(err);
          return;
        }
        t.oncomplete = () => resolve(result?.result ?? result);
        t.onerror = () => reject(t.error);
      })
  );
}

export async function cacheGet(key) {
  try {
    const rec = await tx("readonly", (store) => store.get(key));
    if (!rec) return null;
    return { blob: rec.blob, createdAt: rec.createdAt };
  } catch {
    return null;
  }
}

export async function cachePut(key, blob) {
  try {
    await tx("readwrite", (store) =>
      store.put({ blob, createdAt: Date.now() }, key)
    );
    await prune();
  } catch {
    /* cache is best-effort */
  }
}

// Keep the cache bounded: drop the oldest clips once it grows too large.
async function prune() {
  try {
    const keys = await tx("readonly", (store) => store.getAllKeys());
    if (keys.length <= MAX_ENTRIES) return;
    const entries = await tx("readonly", (store) => store.getAll());
    const sorted = entries
      .map((e, i) => ({ key: keys[i], createdAt: e.createdAt || 0 }))
      .sort((a, b) => a.createdAt - b.createdAt);
    const drop = sorted.slice(0, sorted.length - MAX_ENTRIES);
    await tx("readwrite", (store) => {
      for (const d of drop) store.delete(d.key);
    });
  } catch {
    /* best-effort */
  }
}

export async function cacheClear() {
  try {
    await tx("readwrite", (store) => store.clear());
  } catch {
    /* best-effort */
  }
}

export async function cacheStats() {
  try {
    const keys = await tx("readonly", (store) => store.getAllKeys());
    return { count: keys.length, max: MAX_ENTRIES };
  } catch {
    return { count: 0, max: MAX_ENTRIES };
  }
}

// In-memory clip cache, so repeat playback within a session never touches disk.
const memory = new Map();

export function memoryGet(key) {
  return memory.get(key) || null;
}

export function memoryPut(key, blob) {
  memory.set(key, blob);
  if (memory.size > 60) {
    const oldest = memory.keys().next().value;
    memory.delete(oldest);
  }
}
