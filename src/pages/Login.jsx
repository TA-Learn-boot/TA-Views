import { useState } from 'react'
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { ThemeToggle } from '../components/ThemeToggle.jsx'
import { BrandLogo } from '../components/BrandLogo.jsx'
import { validateEmail } from '../validation/credentials.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Space out login vs the next API call (e.g. /testok) to reduce 429 rate-limit hits. Override with VITE_POST_LOGIN_DELAY_MS (0 = no wait). */
const rawDelay = Number(import.meta.env.VITE_POST_LOGIN_DELAY_MS)
const postLoginDelayMs = Number.isFinite(rawDelay) && rawDelay >= 0 ? rawDelay : 800

export function Login() {
  const { login, isAuthenticated } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/test'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleEmailBlur() {
    setEmailError(validateEmail(email))
  }

  function handlePasswordBlur() {
    setPasswordError(!password ? 'Password is required.' : '')
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const emailErr = validateEmail(email)
    const passwordErr = !password ? 'Password is required.' : ''
    setEmailError(emailErr)
    setPasswordError(passwordErr)
    if (emailErr || passwordErr) return
    setLoading(true)
    try {
      await login(email.trim(), password)
      await sleep(postLoginDelayMs)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <header className="auth-top">
        <BrandLogo />
        <ThemeToggle />
      </header>

      <main className="auth-card">
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-sub">Welcome to karthiks travel agency.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error ? <div className="banner banner-error">{error}</div> : null}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setEmailError('')
                setError('')
              }}
              onBlur={handleEmailBlur}
              required
              maxLength={254}
              className={emailError ? 'field-input-error' : undefined}
            />
            {emailError ? <span className="field-error">{emailError}</span> : null}
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setPasswordError('')
                setError('')
              }}
              onBlur={handlePasswordBlur}
              required
              className={passwordError ? 'field-input-error' : undefined}
            />
            {passwordError ? <span className="field-error">{passwordError}</span> : null}
          </label>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer">
          New here?{' '}
          <Link className="link" to="/signup">
            Create an account
          </Link>
        </p>
      </main>
    </div>
  )
}
