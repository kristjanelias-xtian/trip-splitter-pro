// Cloudflare Pages Function — rewrite HTML meta tags for Kopikas subdomain
// so iOS reads "Kopikas" instead of "Spl1t" at Add to Home Screen time.

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url)
  const hostname = url.hostname

  // Serve dynamic Kopikas manifest with custom start_url when ?start= is present
  if (hostname.startsWith('kopikas.') && url.pathname === '/kopikas-manifest.webmanifest' && url.searchParams.has('start')) {
    const startUrl = '/' + url.searchParams.get('start')!.replace(/^\/+/, '').replace(/[^a-zA-Z0-9/\-_]/g, '')
    const manifest = {
      name: 'Kopikas',
      short_name: 'Kopikas',
      description: 'Lapse taskuraha, mänguliselt',
      start_url: startUrl,
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#1a1308',
      theme_color: '#d97706',
      icons: [
        { src: '/kopikas-favicon.png', sizes: '32x32', type: 'image/png' },
        { src: '/kopikas-icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/kopikas-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      ],
    }
    return new Response(JSON.stringify(manifest), {
      headers: { 'Content-Type': 'application/manifest+json' },
    })
  }

  const response = await context.next()
  const contentType = response.headers.get('content-type') || ''

  // Only rewrite HTML responses on kopikas.* hostname
  if (!contentType.includes('text/html')) return response
  if (!hostname.startsWith('kopikas.')) return response

  let html = await response.text()

  // Swap apple-mobile-web-app-title
  html = html.replace(
    'content="Spl1t"',
    'content="Kopikas"'
  )

  // Swap <title>
  html = html.replace(
    '<title>Spl1t</title>',
    '<title>Kopikas</title>'
  )

  // Swap theme-color
  html = html.replace(
    /content="#e8613a"/g,
    'content="#d97706"'
  )
  html = html.replace(
    /content="#1A1A2E"/g,
    'content="#d97706"'
  )

  // Swap manifest — on wallet routes, add ?start= so iOS fetches a
  // dynamic manifest with start_url pointing to the wallet path
  const urlPath = url.pathname
  const isWalletRoute = urlPath !== '/' && urlPath !== '/login' && urlPath !== '/create'
    && !urlPath.endsWith('/parent')
  if (isWalletRoute) {
    const safeUrl = urlPath.replace(/[^a-zA-Z0-9/\-_]/g, '')
    html = html.replace(
      'href="/manifest.webmanifest"',
      `href="/kopikas-manifest.webmanifest?start=${encodeURIComponent(safeUrl)}"`
    )
  } else {
    html = html.replace(
      'href="/manifest.webmanifest"',
      'href="/kopikas-manifest.webmanifest"'
    )
  }

  // Swap icons
  html = html.replace(
    'href="/favicon.png?v=2"',
    'href="/kopikas-favicon.png"'
  )
  html = html.replace(
    'href="/favicon-16.png?v=2"',
    'href="/kopikas-favicon.png"'
  )
  html = html.replace(
    'href="/apple-touch-icon.png?v=2"',
    'href="/kopikas-apple-touch-icon.png"'
  )

  return new Response(html, {
    status: response.status,
    headers: response.headers,
  })
}
