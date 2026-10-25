/**
 * Service worker. Сборки нет, файлы статические — поэтому оболочка
 * перечислена руками: после изменения состава файлов нужно поднять VERSION,
 * иначе установленное приложение продолжит отдавать старый кэш.
 *
 * Навигация → сеть, при отсутствии связи — кэшированная оболочка.
 * Свои файлы → кэш, обновляется в фоне.
 * API провайдеров → мимо кэша вообще.
 */

const VERSION = 'v6';
const CACHE = `aibase-${VERSION}`;

/** Документ оболочки кэшируется отдельно, см. precache. */
const SHELL_DOC = './';

const SHELL = [
  './manifest.webmanifest',
  './css/app.css',
  './js/router.js',
  './js/ui.js',
  './js/icons.js',
  './js/storage.js',
  './js/ai.js',
  './js/prompts.js',
  './js/cards.js',
  './js/pwa.js',
  './js/install.js',
  './js/views/home.js',
  './js/views/section.js',
  './js/views/topic.js',
  './js/views/term.js',
  './js/views/practice.js',
  './js/views/cards.js',
  './js/views/review.js',
  './js/views/exam.js',
  './js/views/settings.js',
  './data/content.js',
  './data/exam.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);

  // Хостинг перенаправляет index.html на «/», а перенаправленным ответом
  // нельзя отвечать на навигацию. Поэтому канонический URL кладём сами.
  const res = await fetch(new Request(SHELL_DOC, { cache: 'reload' }));
  if (res.ok && !res.redirected) await cache.put(SHELL_DOC, res);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) {
    // Обновляем в фоне, чтобы следующий запуск получил свежий файл.
    fetch(request).then((res) => {
      if (res.ok && !res.redirected) cache.put(request, res.clone());
    }).catch(() => {});
    return hit;
  }
  const res = await fetch(request);
  if (res.ok && res.type === 'basic' && !res.redirected) cache.put(request, res.clone());
  return res;
}

async function navigate(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE);
    return (await cache.match(SHELL_DOC)) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Anthropic, Google и прочие — мимо кэша.

  if (request.mode === 'navigate') {
    event.respondWith(navigate(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});
