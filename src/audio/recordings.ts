// Parent recordings of the phonics sounds, kept in IndexedDB on this device.
// A recording always wins over the shipped file for the same sound.

const DB = 'noa-english-audio';
const STORE = 'recordings';

export interface Recording {
  id: string;
  blob: Blob;
  savedAt: number;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getRecording(id: string): Promise<Recording | undefined> {
  try {
    return await tx<Recording | undefined>('readonly', (s) => s.get(id));
  } catch {
    return undefined;
  }
}

export async function listRecordingIds(): Promise<string[]> {
  try {
    return (await tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys())) as string[];
  } catch {
    return [];
  }
}

export async function saveRecording(id: string, blob: Blob) {
  await tx('readwrite', (s) => s.put({ id, blob, savedAt: Date.now() } satisfies Recording));
}

export async function deleteRecording(id: string) {
  await tx('readwrite', (s) => s.delete(id));
}
