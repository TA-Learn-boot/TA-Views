import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getGatewayBaseUrl } from '../config/loadGatewayConfig.js'
import { useTheme } from '../context/ThemeContext.jsx'
import { ThemeToggle } from '../components/ThemeToggle.jsx'
import { BrandLogo } from '../components/BrandLogo.jsx'
import { PASSWORD_MIN_LENGTH, validateEmail, validatePasswordSignup } from '../validation/credentials.js'

const ROLE_LABELS = { user: 'User', admin: 'Admin' }

function rolesSummaryLabel(selected) {
  const set = new Set(selected.map((x) => x.toLowerCase()))
  const ordered = ['user', 'admin'].filter((r) => set.has(r))
  if (ordered.length === 0) return 'Select roles…'
  return ordered.map((r) => ROLE_LABELS[r]).join(', ')
}

export function Signup() {
  const { theme } = useTheme()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRoles, setSelectedRoles] = useState(() => ['user'])
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleEmailBlur() {
    setEmailError(validateEmail(email))
  }

  function handlePasswordBlur() {
    setPasswordError(validatePasswordSignup(password))
  }

  function toggleRole(role) {
    setError('')
    setSelectedRoles((prev) => {
      const lower = role.toLowerCase()
      const set = new Set(prev.map((r) => r.toLowerCase()))
      if (set.has(lower)) {
        if (set.size === 1) return prev
        set.delete(lower)
      } else {
        set.add(lower)
      }
      return [...set]
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    const emailErr = validateEmail(email)
    const passwordErr = validatePasswordSignup(password)
    setEmailError(emailErr)
    setPasswordError(passwordErr)
    if (emailErr || passwordErr) return
    const roles = ['user', 'admin'].filter((r) => selectedRoles.map((x) => x.toLowerCase()).includes(r))
    if (roles.length === 0) {
      setError('Select at least one role.')
      return
    }
    setLoading(true)
    try {
      const base = await getGatewayBaseUrl()
      const res = await fetch(`${base}/identity/api/user/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, roles }),
      })
      if (res.status === 204) {
        setSuccess(true)
        return
      }
      const text = await res.text()
      let msg = `Signup failed (${res.status})`
      try {
        const j = text ? JSON.parse(text) : null
        if (j?.message) msg = typeof j.message === 'string' ? j.message : JSON.stringify(j.message)
        else if (j?.error) msg = typeof j.error === 'string' ? j.error : JSON.stringify(j.error)
      } catch {
        if (text) msg = text
      }
      throw new Error(msg)
    } catch (err) {
      setError(err?.message || 'Signup failed')
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
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Register via the identity API ({theme} theme).</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error ? <div className="banner banner-error">{error}</div> : null}
          {success ? (
            <div className="banner banner-success">
              Account created. You can{' '}
              <Link className="link" to="/login">
                sign in
              </Link>
              .
            </div>
          ) : null}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setPasswordError('')
                setError('')
              }}
              onBlur={handlePasswordBlur}
              required
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={128}
              className={passwordError ? 'field-input-error' : undefined}
            />
            <span className="field-hint">
              At least {PASSWORD_MIN_LENGTH} characters, one uppercase, one lowercase, one number, and one special
              character.
            </span>
            {passwordError ? <span className="field-error">{passwordError}</span> : null}
          </label>

          <div className="field">
            <span>Roles</span>
            <details className="roles-dropdown">
              <summary className="roles-dropdown-summary">
                {rolesSummaryLabel(selectedRoles)}
              </summary>
              <div className="roles-dropdown-panel">
                <label className="roles-option">
                  <input
                    type="checkbox"
                    checked={selectedRoles.map((x) => x.toLowerCase()).includes('user')}
                    onChange={() => toggleRole('user')}
                  />
                  User
                </label>
                <label className="roles-option">
                  <input
                    type="checkbox"
                    checked={selectedRoles.map((x) => x.toLowerCase()).includes('admin')}
                    onChange={() => toggleRole('admin')}
                  />
                  Admin
                </label>
              </div>
            </details>
            <span className="field-hint">Payload uses a JSON array of lowercase role names.</span>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading || success}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link className="link" to="/login">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  )
}
