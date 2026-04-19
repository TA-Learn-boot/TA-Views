import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { ThemeToggle } from '../components/ThemeToggle.jsx'
import { BrandLogo } from '../components/BrandLogo.jsx'
import { UserMenu } from '../components/UserMenu.jsx'

export function TestPage() {
  const { authorizedFetch, expiresAt } = useAuth()
  const { theme } = useTheme()

  const [status, setStatus] = useState('idle')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  const runTest = useCallback(async (maybeSignal) => {
    const signal = maybeSignal instanceof AbortSignal ? maybeSignal : undefined
    setError('')
    setStatus('loading')
    try {
      const res = await authorizedFetch('/identity/api/testok', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        ...(signal ? { signal } : {}),
      })
      const text = await res.text()
      setBody(text || `(empty body, status ${res.status})`)
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      setStatus('ok')
    } catch (e) {
      if (e?.name === 'AbortError') return
      setStatus('error')
      setError(e?.message || 'Request failed')
    }
  }, [authorizedFetch])

  useEffect(() => {
    const ac = new AbortController()
    runTest(ac.signal)
    return () => ac.abort()
  }, [runTest])

  return (
    <div className="app-shell">
      <header className="app-bar">
        <div className="app-bar-left">
          <BrandLogo />
          <span className="pill">Test page</span>
        </div>
        <div className="app-bar-right">
          <span className="muted small">Theme: {theme}</span>
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <main className="app-main">
        <section className="panel">
          <h1 className="page-title">Landing (test)</h1>
          <p className="muted">
            Calls <code>/identity/api/testok</code> with your Bearer token. Session expires:{' '}
            {expiresAt || '—'}
          </p>

          {error ? <div className="banner banner-error">{error}</div> : null}

          <div className="panel-block">
            <div className="row spread">
              <span className="muted">Status</span>
              <span className={`badge ${status === 'ok' ? 'badge-success' : status === 'error' ? 'badge-error' : ''}`}>
                {status === 'loading' ? 'Loading…' : status === 'ok' ? '200 OK' : status === 'error' ? 'Error' : status}
              </span>
            </div>
            <pre className="code-block">{body || '—'}</pre>
            <button type="button" className="btn btn-primary" onClick={() => runTest()} disabled={status === 'loading'}>
              Retry request
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
