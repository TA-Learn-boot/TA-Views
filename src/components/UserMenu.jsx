import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function UserIcon() {
  return (
    <svg className="user-menu-icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5.5 19.5c1.2-3.5 3.8-5 6.5-5s5.3 1.5 6.5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function UserMenu() {
  const { authorizedFetch, logout } = useAuth()
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const res = await authorizedFetch('/identity/api/user', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      const text = await res.text()
      if (!res.ok) {
        let msg = `Could not load profile (${res.status})`
        try {
          const j = text ? JSON.parse(text) : null
          if (j?.message) msg = typeof j.message === 'string' ? j.message : JSON.stringify(j.message)
        } catch {
          if (text) msg = text.slice(0, 120)
        }
        throw new Error(msg)
      }
      const data = text ? JSON.parse(text) : {}
      setProfile({
        email: data.email ?? '',
        roles: Array.isArray(data.roles) ? data.roles : [],
      })
    } catch (e) {
      setProfile(null)
      setFetchError(e?.message || 'Failed to load user')
    } finally {
      setLoading(false)
    }
  }, [authorizedFetch])

  useEffect(() => {
    if (!open) return
    setProfile(null)
    loadProfile()
  }, [open, loadProfile])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const rolesLabel = profile?.roles?.length ? profile.roles.join(', ') : '—'

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
      >
        <UserIcon />
      </button>
      {open ? (
        <div className="user-menu-panel" role="menu">
          {loading ? <p className="user-menu-muted">Loading…</p> : null}
          {fetchError ? <p className="user-menu-error">{fetchError}</p> : null}
          {!loading && profile ? (
            <>
              <div className="user-menu-row">
                <span className="user-menu-label">Email</span>
                <span className="user-menu-value">{profile.email || '—'}</span>
              </div>
              <div className="user-menu-row">
                <span className="user-menu-label">Roles</span>
                <span className="user-menu-value">{rolesLabel}</span>
              </div>
            </>
          ) : null}
          <button type="button" className="btn btn-secondary user-menu-logout" role="menuitem" onClick={handleLogout}>
            Log out
          </button>
        </div>
      ) : null}
    </div>
  )
}
