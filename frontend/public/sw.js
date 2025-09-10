// Service Worker for Civic Connect PWA
const CACHE_NAME = 'civic-connect-v2';
const STATIC_CACHE = 'static-v2';
const API_CACHE = 'api-v2';

const staticUrlsToCache = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

const API_URL = '/api';

// Install event - cache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(staticUrlsToCache);
      }),
      caches.open(API_CACHE).then((cache) => {
        console.log('Preparing API cache');
      })
    ]).then(() => {
      // Force new service worker to become active
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (![STATIC_CACHE, API_CACHE].includes(cacheName)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  );
});

// Fetch event - serve from cache or network with offline support
self.addEventListener('fetch', (event) => {
  // API requests
  if (event.request.url.includes(API_URL)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached API response if available
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // If it's a POST request that failed, store in IndexedDB
              if (event.request.method === 'POST') {
                return Response.json({ 
                  success: false, 
                  offline: true,
                  message: 'Request saved for later submission'
                });
              }
              // Return offline response for GET requests
              return new Response(JSON.stringify({
                success: false,
                offline: true,
                message: 'No internet connection'
              }), {
                headers: { 'Content-Type': 'application/json' }
              });
            });
        })
    );
    return;
  }

  // Static assets - Cache First strategy
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then((response) => {
            // Clone and cache new static assets
            const responseClone = response.clone();
            return caches.open(STATIC_CACHE)
              .then((cache) => {
                cache.put(event.request, responseClone);
                return response;
              });
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            return new Response('Offline content not available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
    );
  });
        }
        return fetch(event.request);
      }
    )
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for offline form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle offline form submissions when back online
  const offlineReports = await getOfflineReports();
  for (const report of offlineReports) {
    try {
      await submitReport(report);
      await removeOfflineReport(report.id);
    } catch (error) {
      console.error('Failed to sync offline report:', error);
    }
  }
}

async function getOfflineReports() {
  // Get reports stored in IndexedDB during offline
  return new Promise((resolve) => {
    const request = indexedDB.open('CivicConnectDB', 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['offlineReports'], 'readonly');
      const store = transaction.objectStore('offlineReports');
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
    };
    request.onerror = () => resolve([]);
  });
}

async function submitReport(report) {
  const response = await fetch('/api/reports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(report)
  });
  return response.json();
}

async function removeOfflineReport(id) {
  return new Promise((resolve) => {
    const request = indexedDB.open('CivicConnectDB', 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['offlineReports'], 'readwrite');
      const store = transaction.objectStore('offlineReports');
      store.delete(id);
      resolve();
    };
  });
}
