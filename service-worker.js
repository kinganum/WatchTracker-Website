
const CACHE_NAME = 'watchtracker-cache-v3';
// We don't explicitly cache index.html here because Vite hashes assets.
// Instead, we cache requests dynamically as they are made.
const PRECACHE_URLS = [
    '/',
    '/favicon.svg',
    '/manifest.json'
];

// Check if we're in development mode
const isDevelopment = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

// Helper function to check if a URL should be cached
function shouldCache(url) {
  // Don't cache in development mode
  if (isDevelopment) {
    return false;
  }
  
  // Don't cache API calls
  if (url.includes('supabase.co') || 
      url.includes('generativelanguage.googleapis.com') ||
      url.includes('/api/')) {
    return false;
  }
  
  // Don't cache source files (Vite dev server files)
  if (url.includes('.tsx') || 
      url.includes('.ts') || 
      url.includes('.jsx') ||
      url.includes('?t=') || // Vite dev server timestamp query params
      url.includes('&t=')) {
    return false;
  }
  
  // Don't cache WebSocket connections
  if (url.startsWith('ws://') || url.startsWith('wss://')) {
    return false;
  }
  
  // Only cache same-origin requests
  try {
    const requestUrl = new URL(url);
    const currentUrl = new URL(self.location.href);
    if (requestUrl.origin !== currentUrl.origin) {
      return false;
    }
  } catch (e) {
    return false;
  }
  
  return true;
}

self.addEventListener('install', event => {
  // Skip waiting in production only
  if (!isDevelopment) {
    self.skipWaiting();
  }
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Opened cache');
        // Only precache in production
        if (!isDevelopment) {
          return cache.addAll(PRECACHE_URLS);
        }
        return Promise.resolve();
      })
      .catch(err => {
        console.warn('Service Worker: Precache failed', err);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  if (!isDevelopment) {
    return self.clients.claim();
  }
});

self.addEventListener('fetch', event => {
  // In development mode, only handle requests we explicitly want to cache
  // Otherwise, let the browser handle it normally (don't intercept)
  if (isDevelopment) {
    // In development, don't intercept any requests - let Vite dev server handle everything
    return;
  }
  
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Check if we should cache this request
  if (!shouldCache(event.request.url)) {
    return; // Let the browser handle it normally
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        // Network first strategy with cache fallback
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Only cache successful responses
            if (networkResponse && networkResponse.status === 200) {
              // Clone the response before caching
              const responseToCache = networkResponse.clone();
              // Only cache if it's a cacheable response type
              if (responseToCache.type === 'basic' || responseToCache.type === 'cors') {
                cache.put(event.request, responseToCache).catch(err => {
                  console.warn('Service Worker: Failed to cache', err);
                });
              }
            }
            return networkResponse;
          })
          .catch(err => {
            // Network failed, return cached response if available
            if (cachedResponse) {
              console.log('Service Worker: Serving from cache', event.request.url);
              return cachedResponse;
            }
            // If no cache and network fails, throw the error
            throw err;
          });

        // Return cached response immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      });
    }).catch(err => {
      // If cache operations fail, just fetch normally
      console.warn('Service Worker: Cache operation failed', err);
      return fetch(event.request);
    })
  );
});
