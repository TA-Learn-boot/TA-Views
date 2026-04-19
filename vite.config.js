import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function readGatewayTarget() {
  const yamlPath = path.join(__dirname, 'public/config/gateway.yaml')
  const text = fs.readFileSync(yamlPath, 'utf8')
  const doc = parse(text)
  const name = (process.env.VITE_APP_ENV || 'qa').toLowerCase() === 'staging' ? 'staging' : 'qa'
  const url = doc?.environments?.[name]?.gatewayBaseUrl
  if (!url || typeof url !== 'string') {
    throw new Error(`gateway.yaml: missing gatewayBaseUrl for "${name}"`)
  }
  return url.replace(/\/$/, '')
}

const identityProxy = {
  '/identity': {
    target: readGatewayTarget(),
    changeOrigin: true,
    secure: false,
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: identityProxy,
  },
  preview: {
    proxy: identityProxy,
  },
})
