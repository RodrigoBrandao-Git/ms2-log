// Service worker do MS2 Log Viewer — deixa o app abrir sem internet (ex.: no
// carro, conectado no WiFi do dash, que nao tem internet).
// Ao publicar uma versao nova, troque CACHE pra forcar o celular a atualizar.
const CACHE = 'ms2log-v10';
const APP_FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Arquivos do app: rede primeiro (pega versao nova), cache se estiver offline.
// Fontes do Google: cache primeiro (nao mudam), guardadas na primeira visita.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (isFont) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      c.put(req, res.clone());
      return res;
    }).catch(() => hit))));
    return;
  }
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('index.html')))
  );
});
