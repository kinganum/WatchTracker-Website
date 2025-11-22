

const DB_NAME = 'WatchTrackerDB';
const DB_VERSION = 4; // Incremented from 3 to 4
const STORE_NAME = 'watchlist';
const SYNC_QUEUE_STORE_NAME = 'sync_queue';
const UPDATES_CACHE_STORE_NAME = 'updates_cache';
const DISCOVERY_CACHE_STORE_NAME = 'discovery_cache'; // New store

// --- FIX: Define type for the database instance ---
let db: IDBDatabase;

// --- FIX: Add return type to openDB promise ---
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('IndexedDB error:', request.error);
            reject('Error opening database');
        };

        request.onsuccess = (event) => {
            db = request.result;
            resolve(db);
        };

        // --- FIX: Type the event for onupgradeneeded ---
        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            // --- FIX: Cast event.target to get the result property ---
            const dbInstance = (event.target as IDBOpenDBRequest).result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
            if (!dbInstance.objectStoreNames.contains(SYNC_QUEUE_STORE_NAME)) {
                dbInstance.createObjectStore(SYNC_QUEUE_STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
            if (!dbInstance.objectStoreNames.contains(UPDATES_CACHE_STORE_NAME)) {
                dbInstance.createObjectStore(UPDATES_CACHE_STORE_NAME, { keyPath: 'itemId' });
            }
            // Add the new store for the Discovery Hub cache
            if (!dbInstance.objectStoreNames.contains(DISCOVERY_CACHE_STORE_NAME)) {
                dbInstance.createObjectStore(DISCOVERY_CACHE_STORE_NAME, { keyPath: 'itemId' });
            }
        };
    });
}

// --- FIX: Add types to parameters and return Promise<void> ---
export async function saveWatchlist(watchlist: any[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.clear(); // Clear before saving new state
        watchlist.forEach(item => {
            store.put(item);
        });

        transaction.oncomplete = () => {
            resolve();
        };

        transaction.onerror = (event) => {
            console.error('Error saving watchlist to IndexedDB:', transaction.error);
            reject(transaction.error);
        };
    });
}

// --- FIX: Add return type Promise<any[]> ---
export async function getWatchlist(): Promise<any[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            console.error('Error getting watchlist from IndexedDB:', request.error);
            reject(request.error);
        };
    });
}

// --- Sync Queue Functions ---

// --- FIX: Add types to parameters and return Promise<void> ---
export async function addActionToQueue(action: any): Promise<void> {
    const db = await openDB();
    const queuedAction = { ...action, timestamp: Date.now() };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SYNC_QUEUE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SYNC_QUEUE_STORE_NAME);
        const request = store.add(queuedAction);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// --- FIX: Add return type Promise<any[]> ---
export async function getActionsFromQueue(): Promise<any[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SYNC_QUEUE_STORE_NAME, 'readonly');
        const store = transaction.objectStore(SYNC_QUEUE_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// --- FIX: Add types to parameters and return Promise<void> ---
export async function updateActionInQueue(action: any): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SYNC_QUEUE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SYNC_QUEUE_STORE_NAME);
        const request = store.put(action);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// --- FIX: Add types to parameters and return Promise<void> ---
export async function removeActionFromQueue(actionId: any): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SYNC_QUEUE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SYNC_QUEUE_STORE_NAME);
        const request = store.delete(actionId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}


// --- FIX: Add return type Promise<void> ---
export async function clearActionQueue(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SYNC_QUEUE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SYNC_QUEUE_STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// --- Updates Cache Functions ---

// --- FIX: Add types to parameters and return Promise<any> ---
export async function getUpdateFromCache(itemId: string): Promise<any> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(UPDATES_CACHE_STORE_NAME, 'readonly');
        const store = transaction.objectStore(UPDATES_CACHE_STORE_NAME);
        const request = store.get(itemId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// --- FIX: Add types to parameters and return Promise<void> ---
export async function saveUpdateToCache(itemId: string, data: any): Promise<void> {
    const db = await openDB();
    const entry = { itemId, data, timestamp: Date.now() };
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(UPDATES_CACHE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(UPDATES_CACHE_STORE_NAME);
        const request = store.put(entry);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// --- Discovery Hub Cache Functions ---

// --- FIX: Add types to parameters and return Promise<any> ---
export async function getDiscoveryFromCache(itemId: string): Promise<any> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(DISCOVERY_CACHE_STORE_NAME, 'readonly');
        const store = transaction.objectStore(DISCOVERY_CACHE_STORE_NAME);
        const request = store.get(itemId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// --- FIX: Add types to parameters and return Promise<void> ---
export async function saveDiscoveryToCache(itemId: string, newData: any): Promise<void> {
    const db = await openDB();
    const existingEntry = await getDiscoveryFromCache(itemId);
    
    const mergedData = {
        ...(existingEntry?.data || {}),
        ...newData,
    };
    
    const entry = { itemId, data: mergedData, timestamp: Date.now() };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(DISCOVERY_CACHE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(DISCOVERY_CACHE_STORE_NAME);
        const request = store.put(entry);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
