// TalkGo Service Worker v2
const CACHE_NAME = 'talkgo-v2';

// キャッシュするファイル一覧
const PRECACHE = [
  './index.html',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap',
];

// インストール: 事前キャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE).catch(() => {
        // フォントなど外部リソースが失敗しても続行
        return cache.add('./index.html');
      });
    }).then(() => self.skipWaiting())
  );
});

// アクティベート: 古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// フェッチ: キャッシュ優先 (オフライン対応)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Anthropic API はキャッシュしない (常にネットワーク)
  if (url.hostname === 'api.anthropic.com') {
    event.respondWith(fetch(event.request).catch(() =>
      new Response(JSON.stringify({
        error: 'offline',
        content: [{ text: 'オフラインのため翻訳できません。' }]
      }), { headers: { 'Content-Type': 'application/json' } })
    ));
    return;
  }

  // その他: キャッシュ優先、なければネットワーク
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // 成功したレスポンスをキャッシュに追加
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // オフライン時にHTMLをフォールバック
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
