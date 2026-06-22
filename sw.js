// TalkGo Service Worker v3
const CACHE_NAME = 'talkgo-v3';

const PRECACHE = [
  './index.html',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
];

// インストール
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// アクティベート: 古いキャッシュを全削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// フェッチ
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ① Anthropic API / Google Fonts → 必ずネットワーク直接アクセス (SW介入しない)
  if (
    url.hostname === 'api.anthropic.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    // event.respondWith を呼ばない = ブラウザがそのままネットワークに繋ぐ
    return;
  }

  // ② アプリのファイル → キャッシュ優先、なければネットワーク
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
