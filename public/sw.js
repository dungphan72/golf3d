// Receives bell pushes while the admin page is closed or the phone is locked.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || '🔔 Có khách gọi phục vụ!';
  const body = data.body || 'Khách đang cần nhân viên hỗ trợ tại line.';
  const url = data.url || '/quan-ly';
  const tag = data.tag || 'service-call-' + Date.now();

  // 1. Notify all open window clients so background tabs can start ringing immediately
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: 'SERVICE_CALL_RING', data });
      }
    })
  );

  // 2. Show persistent notification with strong vibration pattern for lock screen
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // Strong ringtone vibration pattern for lock screen
      vibrate: [600, 250, 600, 250, 600, 300, 800, 200, 800],
      tag,
      renotify: true,
      requireInteraction: true,
      data: { url, ...data },
      actions: [
        { action: 'open', title: '🔔 Xem cuộc gọi' },
      ],
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/quan-ly';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.postMessage({ type: 'SERVICE_CALL_FOCUS', data: event.notification.data });
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
