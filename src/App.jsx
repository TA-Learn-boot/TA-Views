import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { Login } from './pages/Login.jsx'
import { Signup } from './pages/Signup.jsx'
import { TestPage } from './pages/TestPage.jsx'
import { RequireAuth } from './components/RequireAuth.jsx'
import { getGatewayBaseUrl } from './config/loadGatewayConfig.js'

function ConfigGate({ children }) {
  const [ready, setReady] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    getGatewayBaseUrl()
      .then(() => setReady(true))
      .catch((e) => setErr(e?.message || 'Config error'))
  }, [])

  if (err) {
    return (
      <div className="auth-shell">
        <main className="auth-card">
          <h1 className="auth-title">Configuration</h1>
          <div className="banner banner-error">{err}</div>
          <p className="muted small">Check public/config/gateway.yaml and VITE_APP_ENV.</p>
        </main>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="auth-shell">
        <main className="auth-card">
          <p className="muted">Loading gateway configuration…</p>
        </main>
      </div>
    )
  }

  return children
}

export default function App() {
  return (
    <ConfigGate>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/test"
            element={
              <RequireAuth>
                <TestPage />
              </RequireAuth>
            }
          />
          <Route path="/" element={<Navigate to="/test" replace />} />
          <Route path="*" element={<Navigate to="/test" replace />} />
        </Routes>
      </AuthProvider>
    </ConfigGate>
  )
}
