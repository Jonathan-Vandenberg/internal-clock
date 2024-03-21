self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('my-cache').then((cache) => {
            const androidImages = [
                '/android/40.png',
                '/android/80.png',
                '/android/120.png',
                '/android/256.png',
            ];
            const iosImages = [
                '/ios/40.png',
                '/ios/80.png',
                '/ios/120.png',
                '/ios/256.png',
            ];

            const allImages = [...androidImages, ...iosImages];

            return cache.addAll([
                '/',
                '/index.html',
                '/manifest.json',
                ...allImages
            ]).catch(error => {
                console.error('Cache addAll error:', error);
            });
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).catch(error => {
                console.error('Fetch error:', error);
            });
        })
    );
});
