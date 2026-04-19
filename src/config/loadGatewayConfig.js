import { parse } from 'yaml'

let cachedBaseUrl = null
let loadPromise = null

function envName() {
  const v = (import.meta.env.VITE_APP_ENV || 'qa').toLowerCase()
  return v === 'staging' ? 'staging' : 'qa'
}

export async function getGatewayBaseUrl() {
  // Dev + `vite preview`: same-origin `/identity/...` so Vite proxies to the gateway (avoids cross-origin OPTIONS/CORS).
  if (import.meta.env.DEV || import.meta.env.MODE === 'preview') {
    return ''
  }

  if (cachedBaseUrl) return cachedBaseUrl
  if (!loadPromise) {
    loadPromise = (async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}config/gateway.yaml`)
      if (!res.ok) throw new Error(`Failed to load gateway config: ${res.status}`)
      const text = await res.text()
      const doc = parse(text)
      const name = envName()
      const url = doc?.environments?.[name]?.gatewayBaseUrl
      if (!url || typeof url !== 'string') {
        throw new Error(`gatewayBaseUrl missing for environment "${name}"`)
      }
      cachedBaseUrl = url.replace(/\/$/, '')
      return cachedBaseUrl
    })()
  }
  return loadPromise
}
