export function dbError(error, fallback) {
  const message = error?.message || fallback || 'Request failed.'
  return { ok: false, error: message }
}
