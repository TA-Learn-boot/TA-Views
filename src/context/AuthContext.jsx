import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { getGatewayBaseUrl } from '../config/loadGatewayConfig.js'
import { authorizationHeader } from '../api/authHeader.js'

const STORAGE_ACCESS = 'ta-views-access-token'
const STORAGE_REFRESH = 'ta-views-refresh-token'
const STORAGE_EXPIRES = 'ta-views-expires-at'

/** Proactively refresh slightly before expiresIn to avoid last-millisecond 401s */
const ACCESS_EXPIRY_SKEW_MS = 30_000

function isAccessTokenExpired(expiresInStr, nowMs = Date.now()) {
  if (!expiresInStr || typeof expiresInStr !== 'string' || !expiresInStr.trim()) return false
  const expiryMs = Date.parse(expiresInStr.trim())
  if (!Number.isFinite(expiryMs)) return false
  return nowMs >= expiryMs - ACCESS_EXPIRY_SKEW_MS
}

const AuthContext = createContext(null)

async function parseJsonSafe(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(STORAGE_ACCESS) || '')
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem(STORAGE_REFRESH) || '')
  const [expiresAt, setExpiresAt] = useState(() => localStorage.getItem(STORAGE_EXPIRES) || '')
  const refreshInFlight = useRef(null)

  useEffect(() => {
    if (accessToken) localStorage.setItem(STORAGE_ACCESS, accessToken)
    else localStorage.removeItem(STORAGE_ACCESS)
  }, [accessToken])

  useEffect(() => {
    if (refreshToken) localStorage.setItem(STORAGE_REFRESH, refreshToken)
    else localStorage.removeItem(STORAGE_REFRESH)
  }, [refreshToken])

  useEffect(() => {
    if (expiresAt) localStorage.setItem(STORAGE_EXPIRES, expiresAt)
    else localStorage.removeItem(STORAGE_EXPIRES)
  }, [expiresAt])

  const persistSession = useCallback((payload) => {
    const t = payload.token || ''
    const r = payload.refreshToken || ''
    const e = payload.expiresIn || ''
    if (t) localStorage.setItem(STORAGE_ACCESS, t)
    else localStorage.removeItem(STORAGE_ACCESS)
    if (r) localStorage.setItem(STORAGE_REFRESH, r)
    else localStorage.removeItem(STORAGE_REFRESH)
    if (e) localStorage.setItem(STORAGE_EXPIRES, e)
    else localStorage.removeItem(STORAGE_EXPIRES)
    setAccessToken(t)
    setRefreshToken(r)
    setExpiresAt(e)
  }, [])

  const clearSession = useCallback(() => {
    setAccessToken('')
    setRefreshToken('')
    setExpiresAt('')
  }, [])

  const login = useCallback(
    async (email, password) => {
      const base = await getGatewayBaseUrl()
      const res = await fetch(`${base}/identity/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const body = await parseJsonSafe(res)
      if (!res.ok) {
        const msg = body?.message || body?.error || `Login failed (${res.status})`
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
      }
      persistSession({
        token: body.token || '',
        refreshToken: body.refreshToken || '',
        expiresIn: body.expiresIn || '',
      })
    },
    [persistSession],
  )

  const refreshSession = useCallback(async () => {
    const rt = refreshToken || localStorage.getItem(STORAGE_REFRESH) || ''
    if (!rt) throw new Error('No refresh token')
    if (refreshInFlight.current) return refreshInFlight.current

    refreshInFlight.current = (async () => {
      try {
        const base = await getGatewayBaseUrl()
        // GET (no body — fetch forbids a body on GET).
        const res = await fetch(`${base}/identity/api/auth/refresh/${encodeURIComponent(rt)}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        })
        const body = await parseJsonSafe(res)
        if (!res.ok) {
          clearSession()
          const msg = body?.message || body?.error || `Refresh failed (${res.status})`
          throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
        }
        persistSession({
          token: body.token || '',
          refreshToken: body.refreshToken || rt,
          expiresIn: body.expiresIn || '',
        })
      } finally {
        refreshInFlight.current = null
      }
    })()

    return refreshInFlight.current
  }, [clearSession, persistSession, refreshToken])

  const logout = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_ACCESS) || accessToken
    if (token) {
      try {
        const base = await getGatewayBaseUrl()
        const headers = new Headers({ 'Content-Type': 'application/json' })
        const auth = authorizationHeader(token)
        if (auth.Authorization) headers.set('Authorization', auth.Authorization)
        await fetch(`${base}/identity/api/auth/logout`, {
          method: 'POST',
          headers,
          body: '{}',
        })
      } catch {
        /* still clear local session if the network request fails */
      }
    }
    clearSession()
  }, [accessToken, clearSession])

  const authorizedFetch = useCallback(
    async (path, init = {}, { retryOn401 = true } = {}) => {
      const base = await getGatewayBaseUrl()
      const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`

      const storedExpires = localStorage.getItem(STORAGE_EXPIRES) || expiresAt
      const storedRefresh = localStorage.getItem(STORAGE_REFRESH) || refreshToken
      if (storedRefresh && storedExpires && isAccessTokenExpired(storedExpires)) {
        try {
          await refreshSession()
        } catch {
          /* refreshSession clears session on failure; continue so caller still gets the error response */
        }
      }

      const headers = new Headers(init.headers || {})
      if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
        headers.set('Content-Type', 'application/json')
      }
      const token = localStorage.getItem(STORAGE_ACCESS) || accessToken
      const auth = authorizationHeader(token)
      if (auth.Authorization) headers.set('Authorization', auth.Authorization)

      let res = await fetch(url, { ...init, headers })

      const refreshAfter401 = localStorage.getItem(STORAGE_REFRESH) || ''
      if (res.status === 401 && retryOn401 && refreshAfter401) {
        await refreshSession()
        const h2 = new Headers(init.headers || {})
        if (!h2.has('Content-Type') && init.body && typeof init.body === 'string') {
          h2.set('Content-Type', 'application/json')
        }
        const auth2 = authorizationHeader(localStorage.getItem(STORAGE_ACCESS) || '')
        if (auth2.Authorization) h2.set('Authorization', auth2.Authorization)
        res = await fetch(url, { ...init, headers: h2 })
      }

      return res
    },
    [accessToken, expiresAt, refreshSession, refreshToken],
  )

  const value = useMemo(
    () => ({
      accessToken,
      refreshToken,
      expiresAt,
      isAuthenticated: Boolean(accessToken),
      login,
      logout,
      refreshSession,
      authorizedFetch,
      persistSession,
    }),
    [
      accessToken,
      refreshToken,
      expiresAt,
      login,
      logout,
      refreshSession,
      authorizedFetch,
      persistSession,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
