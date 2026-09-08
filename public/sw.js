// Retire the former portfolio worker; leave unrelated origin storage alone.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('jc-portfolio-')).map(key=>caches.delete(key)));
  await self.registration.unregister();
})()));
