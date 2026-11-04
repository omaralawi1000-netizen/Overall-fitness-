/* Aven's service worker: the app opens from the phone, online or not. It stays under the `a2` name because the site's
   address is shared with another app that cleans up anything called `aven…`.
   - the page itself: the network first (a new version shows on the next open), the saved copy when there is no network;
   - hashed files (assets/…): saved once, never asked for again (their names change when they change);
   - the photo, fonts and icons: the saved copy at once, refreshed in the background.
   It never reloads a page. The first worker takes over at once; an update waits until every Aven tab is closed. */
const CACHE = 'a2-app-1';
// the first visit saves the whole app (the page, its scripts and styles, the photo, the type), so one online open is enough for offline
self.addEventListener('install', (e) => e.waitUntil((async () => {
  const cache = await caches.open(CACHE), page = await fetch('./', { cache: 'reload' }), html = await page.clone().text();
  await cache.put('./', page);
  const urls = new Set(['./manifest.webmanifest', './icon-192.png', './mask.png', './photo.jpg']);
  for (const m of html.matchAll(/(?:href|src)="(\.\/[^"]+)"/g)) urls.add(m[1]);
  // the lazily loaded 3D file is named inside the main script
  const main = [...urls].find((u) => /assets\/index-.*\.js$/.test(u));
  if (main) { const js = await (await fetch(main)).text(); for (const m of js.matchAll(/assets\/[\w.-]+\.js/g)) urls.add('./' + m[0]); }
  await Promise.all([...urls].map((u) => cache.add(u).catch(() => {})));
  if (!self.registration.active) self.skipWaiting(); // only the very first worker takes over at once; an update waits for the tabs to close
})()));
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim().then(() => caches.keys()).then((ks) => Promise.all(ks.filter((k) => k.startsWith('a2-app-') && k !== CACHE).map((k) => caches.delete(k))))));
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const put = (res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; };
  if (req.mode === 'navigate') { e.respondWith(fetch(req).then(put).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./')))); return; }
  if (url.pathname.includes('/assets/')) { e.respondWith(caches.match(req).then((r) => r || fetch(req).then(put))); return; }
  e.respondWith(caches.match(req).then((r) => { const net = fetch(req).then(put).catch(() => r); return r || net; }));
});
