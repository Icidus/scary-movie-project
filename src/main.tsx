import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// PWA: keep the installed app updated without requiring close/reopen.
// - `registerType: 'autoUpdate'` generates an SW that checks for updates.
// - We also trigger periodic checks and on-focus checks.
// - When an update is found, we apply it and reload to pick up new assets.
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Activate the new service worker and reload to use the new build.
    updateSW(true)
      .catch(() => {
        // If activation fails for any reason, a reload still tends to recover.
        window.location.reload()
      })
  },
})

if (import.meta.env.PROD) {
  const CHECK_INTERVAL_MS = 60_000

  window.setInterval(() => {
    updateSW().catch(() => {})
  }, CHECK_INTERVAL_MS)

  window.addEventListener('focus', () => {
    updateSW().catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
