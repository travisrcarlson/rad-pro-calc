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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
