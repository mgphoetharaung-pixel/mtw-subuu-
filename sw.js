const CACHE_NAME = 'mtw-subuu-v9'; // SUBUU AI assistant (FX + Weather + Chat + NL parse)
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './firebase-config.js',
    './auth.js',
    './database.js',
    './ui-handlers.js',
    './features.js',
    './time-utils.js',
    './payment.js',
    './ai-assistant.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://img.icons8.com/fluent/512/piggy-bank.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache); // အဟောင်းတွေကို ဖျက်ပစ်မည်
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 🌟 Network First (no-cache revalidate) + Cache Refresh
// HTTP cache ထဲက အဟောင်းကို ယုံမနေရ — ဆာဗာနဲ့ တစ်ခါ revalidate လုပ်ပြီးမှ သုံးမည်
self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) {
        return;
    }
    event.respondWith(
        fetch(req, { cache: 'no-cache' }).then(response => {
            if (response && response.status === 200) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
            }
            return response;
        }).catch(() => {
            return caches.match(req);
        })
    );
});