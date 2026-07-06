// ============================================================================
//  Zymata — Service Worker (Guru + Wali)
// ============================================================================
//  PENTING: naikkan CACHE_VERSION setiap kali rilis versi baru aplikasi.
//  (atau pakai skrip bump-sw-version.js supaya otomatis).
//  Selama versi ini berubah, SW baru mengambil file baru, membuang cache lama,
//  dan pengguna TIDAK perlu hapus cache manual lagi.
// ============================================================================
const CACHE_VERSION = 'v20260703-053624';
const CACHE_NAME = `zymata-shell-${CACHE_VERSION}`;

// Semua file inti yang dipakai KEDUA tampilan (Guru & Wali).
// Wali memakai guru-shell.css (tema terang) + wali-shell.js;
// Guru memakai guru-shell-dark.css (tema gelap) + guru-shell.js.
const APP_SHELL = [
  './guru-shell.html',
  './wali-shell.html',
  './guru-shell.css',        // <- tema TERANG (Wali). Dulu TIDAK di-cache -> sumber bug.
  './guru-shell-dark.css',   // <- tema GELAP (Guru)
  './guru-shell.js',
  './wali-shell.js',
  './native-enhance.js',
  './native-pro.js',
  './supabase-mobile.js',
  './chat-mobile.js',
  './manifest.webmanifest',
  './assets/sdplus-app-icon-32.png',
  './assets/sdplus-app-icon-180.png',
  './assets/guru-avatar.svg'
];

// --- Install: precache TOLERAN (satu file gagal tak merusak seluruh install) ---
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        APP_SHELL.map(url =>
          fetch(url, { cache: 'no-cache' })
            .then(res => { if (res && res.ok) return cache.put(url, res); })
            .catch(() => { /* abaikan file yang tak ada */ })
        )
      )
    ).then(() => self.skipWaiting())
  );
});

// --- Activate: hapus semua cache versi lama, lalu ambil alih semua tab ---
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// --- Izinkan halaman menyuruh SW baru langsung aktif (opsional) ---
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// --- Fetch strategy ---
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // 1) Navigasi halaman -> NETWORK-FIRST: selalu ambil HTML terbaru saat online,
  //    jatuh ke cache kalau offline. Ini yang bikin UI/warna baru langsung muncul.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(c => c || caches.match('./guru-shell.html')))
    );
    return;
  }

  // 2) Aset same-origin (css/js/gambar) -> STALE-WHILE-REVALIDATE:
  //    tampil cepat dari cache, sambil diam-diam ambil versi baru & perbarui cache.
  //    Jadi CSS tema TIDAK akan "nyangkut" lama lagi -> tak ada layar putih.
  if (sameOrigin) {
    event.respondWith(
      caches.match(request).then(cached => {
        const network = fetch(request).then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // 3) Cross-origin (CDN font/supabase) -> network dulu, fallback cache bila ada.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
