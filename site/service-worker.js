const CACHE_NAME = 'validade-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  'https://unpkg.com/html5-qrcode', // Cache da biblioteca do scanner
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Evento de Instalação: Salva os arquivos no cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento Fetch: Intercepta as requisições
// Se o recurso estiver no cache, entrega a partir dele. Senão, busca na rede.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Encontrou no cache
        }
        return fetch(event.request); // Não encontrou, busca na rede
      })
  );
});