// 缓存名称和版本
const CACHE_NAME = 'video-player-v1';
const urlsToCache = [
  './play.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/hls.js@latest'
];

// 安装阶段：缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('缓存已打开');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('核心资源已缓存');
        return self.skipWaiting(); // 立即激活新的service worker
      })
  );
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('Service Worker已激活');
      return self.clients.claim(); // 控制所有客户端
    })
  );
});

// 拦截网络请求，实现缓存策略
self.addEventListener('fetch', (event) => {
  // 对于视频流和大文件，优先使用网络请求
  if (event.request.url.includes('.m3u8') || 
      event.request.url.includes('.ts') || 
      event.request.url.includes('.mp4') ||
      event.request.url.includes('.m4v')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // 如果网络请求失败，尝试从缓存中获取
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // 对于其他资源，使用缓存优先策略
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 如果缓存中有匹配的响应，则返回缓存的响应
        if (response) {
          return response;
        }
        
        // 否则，发起网络请求
        return fetch(event.request)
          .then((response) => {
            // 检查响应是否有效
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 克隆响应，因为响应流只能使用一次
            const responseToCache = response.clone();
            
            // 将响应添加到缓存
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // 处理网络错误
            console.log('网络请求失败，尝试使用备用资源');
          });
      })
  );
});

// 处理推送通知
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: 'icons/icon-192x192.png',
    badge: 'icons/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || './play.html'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 处理通知点击事件
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // 如果有打开的窗口，聚焦到该窗口
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        // 否则，打开一个新窗口
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
});