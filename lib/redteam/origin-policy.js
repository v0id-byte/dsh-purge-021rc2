/** Loopback API access; public reverse proxies require explicit trusted origins. */
export function isRedteamOriginAllowed(req, publicOrigin = process.env.DSH_PURGE_PUBLIC_ORIGIN || '') {
  const remote = String(req.socket?.remoteAddress || '')
  const loopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)
  if (!loopback) return false
  const host = typeof req.headers.host === 'string' ? req.headers.host : ''
  const hostLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host)
  const origin = req.headers.origin
  if (origin === undefined || origin === '' || origin === 'null') return true
  if (hostLocal && typeof origin === 'string' && /^app:/i.test(origin)) return true
  try {
    const url = new URL(origin)
    if (url.host !== host) return false
    if (hostLocal) return true
    return ['http:', 'https:'].includes(url.protocol)
      && url.origin === origin
      && new URL(publicOrigin).origin === url.origin
  } catch {
    return false
  }
}
