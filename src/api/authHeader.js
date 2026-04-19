export function authorizationHeader(token) {
  const t = (token || '').trim()
  if (!t) return {}
  if (t.toLowerCase().startsWith('bearer ')) {
    return { Authorization: t }
  }
  return { Authorization: `Bearer ${t}` }
}
