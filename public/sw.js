/**
 * Spl1t Service Worker
 *
 * Primary purpose: ensure the app always launches to /
 * when opened from the home screen, regardless of what
 * URL was saved at install time on iOS Safari.
 *
 * iOS Safari ignores manifest start_url. This SW
 * intercepts the initial navigation and redirects
 * deep links to / when launched in standalone mode.
 *
 * Limitation: the sec-fetch-dest / referrer heuristic
 * for detecting home screen launch is not perfectly
 * reliable on all iOS versions. Layer B (client-side
 * guard in main.tsx) serves as fallback.
 */

self.addEventListener('install', function () {
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url)

  // Only handle same-origin navigation requests
  if (
    event.request.mode !== 'navigate' ||
    url.origin !== self.location.origin
  ) {
    return
  }

  // Kopikas routes are never redirected — they are their own entry point
  if (url.pathname.startsWith('/kopikas/')) return

  // Detect launch from home screen into a deep link.
  // A home screen launch has no referrer and the
  // request destination is a document.
  var isTripRoute = url.pathname.startsWith('/t/')
  var isTopLevelNavigation =
    event.request.headers.get('sec-fetch-dest') === 'document' &&
    !event.request.referrer

  if (isTripRoute && isTopLevelNavigation) {
    event.respondWith(Response.redirect('/', 302))
    return
  }
})
