/* Aven's service worker: the app opens from the phone, online or not. It stays under the `a2` name because the site's
   address is shared with another app that cleans up anything called `aven…`.
   - the page itself: the network first (a new version shows on the next open), the saved copy when there is no network;
   - hashed files (assets/…): saved once, never asked for again (their names change when they change);
   - the photo, fonts and icons: the saved copy at once, refreshed in the background.
   It never reloads a page and never takes over mid-workout: a new worker waits until every Aven tab is closed. */
const CACHE = 'a2-app-1';
self.addEventListener('install', () => {});
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('a2-app-') && k !== CACHE).map((k) => caches.delete(k))))));
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const put = (res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; };
  if (req.mode === 'navigate') { e.respondWith(fetch(req).then(put).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./')))); return; }
  if (url.pathname.includes('/assets/')) { e.respondWith(caches.match(req).then((r) => r || fetch(req).then(put))); return; }
  e.respondWith(caches.match(req).then((r) => { const net = fetch(req).then(put).catch(() => r); return r || net; }));
});
