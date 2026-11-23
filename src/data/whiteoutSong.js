// The Creepers whiteout song, kept only in the commissioner's own browser (IndexedDB), never in the site's files: the site
// is public on GitHub Pages, and a real song can't be posted there. He picks the file once per browser and it stays.
const DB = 'mfl-audio', STORE = 'clips', KEY = 'whiteout';

function open() {
  return new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error('no storage'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function run(mode, fn) {
  const db = await open();
  return new Promise((res, rej) => { const q = fn(db.transaction(STORE, mode).objectStore(STORE)); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}

// { name, data (ArrayBuffer) } or null.
export const loadWhiteoutSong = () => run('readonly', (s) => s.get(KEY)).catch(() => null);
export async function saveWhiteoutSong(file) { const data = await file.arrayBuffer(); await run('readwrite', (s) => s.put({ name: file.name, data }, KEY)); return { name: file.name, data }; }
export const clearWhiteoutSong = () => run('readwrite', (s) => s.delete(KEY)).catch(() => null);
