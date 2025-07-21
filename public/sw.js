const CACHE_NAME = 'cameraai-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  // Add more assets as needed
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});

self.addEventListener('push', event => {
  self.registration.showNotification('CameraAI', {
    body: event.data ? event.data.text() : 'Task complete!',
    icon: '/icon-192.png'
  });
});