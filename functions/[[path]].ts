// Cloudflare Pages Function — rewrite HTML meta tags for Kopikas subdomain
// so iOS reads "Kopikas" instead of "Spl1t" at Add to Home Screen time.

export const onRequest: PagesFunction = async (context) => {
  const response = await context.next()
  const contentType = response.headers.get('content-type') || ''

  // Only rewrite HTML responses on kopikas.* hostname
  if (!contentType.includes('text/html')) return response
  const hostname = new URL(context.request.url).hostname
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

  // Swap manifest
  html = html.replace(
    'href="/manifest.webmanifest"',
    'href="/kopikas-manifest.webmanifest"'
  )

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
