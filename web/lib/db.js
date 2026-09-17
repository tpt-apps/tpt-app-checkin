// Minimal IndexedDB wrapper for a single "tickets" object store, keyed by
// ticket ID. Kept dependency-free so it can be cached offline like every
// other file the app ships.

const DB_NAME = "tpt-checkin";
const DB_VERSION = 1;
const STORE = "tickets";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode) {
  const t = db.transaction(STORE, mode);
  return t.objectStore(STORE);
}

export async function replaceAllTickets(ids) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    const store = t.objectStore(STORE);
    store.clear();
    const now = Date.now();
    for (const id of ids) {
      store.put({ id, status: "unused", checkedAt: null, addedAt: now });
    }
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function getAllTickets() {
  const db = await openDb();
  const store = tx(db, "readonly");
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Mark a ticket as checked in. Returns one of:
 * "checked-in" (newly marked), "already-used" (was already checked in),
 * or "not-found" (ticket ID isn't in the loaded list).
 */
export async function checkIn(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    const store = t.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const ticket = getReq.result;
      if (!ticket) {
        resolve("not-found");
        return;
      }
      if (ticket.status === "used") {
        resolve("already-used");
        return;
      }
      ticket.status = "used";
      ticket.checkedAt = Date.now();
      store.put(ticket);
      resolve("checked-in");
    };
    getReq.onerror = () => reject(getReq.error);
    t.onerror = () => reject(t.error);
  });
}

export async function resetAllCheckIns() {
  const tickets = await getAllTickets();
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    const store = t.objectStore(STORE);
    for (const ticket of tickets) {
      ticket.status = "unused";
      ticket.checkedAt = null;
      store.put(ticket);
    }
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
