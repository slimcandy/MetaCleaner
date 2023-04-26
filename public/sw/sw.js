console.log('Service Worker Registering...');

const assets = ['/', '/index.html'];

async function preCacheResources() {
  const cache = await caches.open('meta-cleaner-assets');
  await cache.addAll(assets);
}
async function getCachedResponse(event) {
  try {
    const fetchResponse = await fetch(event.request);
    return fetchResponse;
  } catch (error) {
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse != null) return cachedResponse;
    console.error(
      `No cached response for ${event.request.url}: ${String(error)}`
    );
    return new Response(); // Return an empty Response object as a fallback
  }
}

function onInstall(event) {
  console.log('Service Worker Installed');
  event.waitUntil(preCacheResources());
}

function onFetch(event) {
  console.log('Service Worker Fetching');
  event.respondWith(getCachedResponse(event));
}

self.addEventListener('install', onInstall);
self.addEventListener('fetch', onFetch);
