/* Jelly Arcade service worker. The precache list and version are written at build time. */
const VERSION = '8e64e329f48c';
const CACHE = 'jelly-arcade-v' + VERSION;
const FILES = ["404/index.html","_next/static/E3oxWcDUjeLpvJbJf4erv/_buildManifest.js","_next/static/E3oxWcDUjeLpvJbJf4erv/_ssgManifest.js","_next/static/chunks/255-09fb0d129bb12f51.js","_next/static/chunks/4bd1b696-c023c6e3521b1417.js","_next/static/chunks/app/_not-found/page-d0dc3c88f8050000.js","_next/static/chunks/app/layout-89b8bdac6c6900bb.js","_next/static/chunks/app/page-0a220d5e43a65e4d.js","_next/static/chunks/framework-4891de286d38ef96.js","_next/static/chunks/main-4fcfdcca36d79901.js","_next/static/chunks/main-app-bbb7b37649648c88.js","_next/static/chunks/pages/_app-7d307437aca18ad4.js","_next/static/chunks/pages/_error-cb2a52f75f2162e2.js","_next/static/chunks/polyfills-42372ed130431b0a.js","_next/static/chunks/webpack-af265a51c39a3e9d.js","_next/static/css/59db5791c8e3be7a.css","_next/static/media/5cc7ff84a6a272e2-s.p.woff2","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","index.txt","manifest.webmanifest","./","404/"];
const SCOPE = self.registration.scope;

self.addEventListener('install', (event) => {
  // The new cache must be complete before this worker can take over. A partial cache fails the install,
  // and the previous worker and cache keep serving.
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const f of FILES) {
        const res = await fetch(new URL(f, SCOPE), { cache: 'reload' });
        if (!res.ok) throw new Error('Could not cache ' + f);
        await cache.put(new URL(f, SCOPE), res);
      }
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      for (const c of clients) c.postMessage({ type: 'JA_CACHE_READY', version: VERSION });
    })(),
  );
});

self.addEventListener('activate', (event) => {
  // Remove only older app caches, and only now that this version is active. IndexedDB is never touched.
  event.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k.startsWith('jelly-arcade-v') && k !== CACHE) await caches.delete(k);
      await self.clients.claim();
      const clients = await self.clients.matchAll();
      for (const c of clients) c.postMessage({ type: 'JA_CACHE_READY', version: VERSION });
    })(),
  );
});

self.addEventListener('message', (event) => {
  // The page asks for activation only between rounds.
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !url.href.startsWith(SCOPE)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await cache.match(new URL('./', SCOPE)) : undefined);
      if (hit) return hit;
      try {
        return await fetch(req);
      } catch (e) {
        if (req.mode === 'navigate') {
          const home = await cache.match(new URL('./', SCOPE));
          if (home) return home;
        }
        throw e;
      }
    })(),
  );
});
