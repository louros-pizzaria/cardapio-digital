// ===== SERVICE WORKER PARA CACHE OFFLINE =====

const CACHE_NAME = 'pizza-delivery-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Assets críticos para cache
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  // Add critical CSS and JS files here
];

// URLs que devem ser cacheadas dinamicamente
const CACHE_PATTERNS = [
  /\/menu/,
  /\/api\/products/,
  /\/api\/categories/,
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
];

// ===== INSTALL EVENT =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// ===== ACTIVATE EVENT =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              return cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName !== CACHE_NAME;
            })
            .map(cacheName => {
              console.log('🗑️ Removing old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ===== FETCH EVENT =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // Handle different types of requests
  if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
    // Static assets - cache first
    event.respondWith(cacheFirst(request));
  } else if (CACHE_PATTERNS.some(pattern => pattern.test(url.href))) {
    // Dynamic content - network first with cache fallback
    event.respondWith(networkFirst(request));
  } else if (url.pathname.startsWith('/api/')) {
    // API requests - network only with offline fallback
    event.respondWith(networkOnly(request));
  } else {
    // Everything else - network first
    event.respondWith(networkFirst(request));
  }
});

// ===== CACHE STRATEGIES =====

// Cache First - for static assets
async function cacheFirst(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Update cache in background
      fetch(request).then(response => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
      }).catch(() => {});
      
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network First - for dynamic content
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', request.url);
    
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    return new Response('Offline', { 
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Network Only - for API requests
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'Check your internet connection'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ===== BACKGROUND SYNC =====
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-orders') {
    event.waitUntil(syncOrders());
  }
});

async function syncOrders() {
  try {
    // Get pending orders from IndexedDB or localStorage
    const pendingOrders = await getPendingOrders();
    
    for (const order of pendingOrders) {
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order)
        });
        
        if (response.ok) {
          await removePendingOrder(order.id);
          console.log('✅ Order synced:', order.id);
        }
      } catch (error) {
        console.error('❌ Failed to sync order:', order.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Helper functions (implement based on your storage strategy)
async function getPendingOrders() {
  // Implement getting pending orders from storage
  return [];
}

async function removePendingOrder(orderId) {
  // Implement removing synced order from storage
}

// ===== MESSAGE HANDLING =====
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🚀 Service Worker loaded');