import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Handle dynamic import failures when a new version has been deployed
window.addEventListener('vite:preloadError', (event) => {
  const key = 'radpro_preload_reload_ts';
  const lastReload = sessionStorage.getItem(key);
  const now = Date.now();

  // Guard against reload loops (allow at most 1 automatic reload per 10 seconds)
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem(key, now.toString());
    console.warn('[Vite] Preload error detected (stale deployment chunk). Auto-reloading page...', event);
    window.location.reload();
  }
});

// Evict stale service workers & caches in Vite dev mode; register offline SW only in production builds
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    (async () => {
      try {
        const hadController = Boolean(navigator.serviceWorker.controller);
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter((k) => k.startsWith('radpro-cache-'))
              .map((k) => caches.delete(k))
          );
        }
        if ((hadController || regs.length > 0) && !sessionStorage.getItem('radpro_dev_sw_cleared')) {
          sessionStorage.setItem('radpro_dev_sw_cleared', '1');
          window.location.reload();
        }
      } catch {
        // Ignore cleanup failures
      }
    })();
  } else if (import.meta.env.PROD && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
