// src/service-worker.js or src/service-worker.ts
self.addEventListener('fetch', (event) => {
    debugger;
    event.respondWith(fetch(event.request));
});
