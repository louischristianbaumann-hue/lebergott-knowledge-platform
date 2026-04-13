import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles/global.css'
import './styles/mycelium.css'

// ── Service Worker ────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => console.warn('SW registration failed:', err));
  });
}

// ── Add to Home Screen (A2HS) Prompt ─────────────────────────────────────
// Shows a branded install banner when the browser fires beforeinstallprompt.
// On iOS Safari (which doesn't fire the event), we show a manual hint instead.

let deferredInstallPrompt = null;

function showA2HSBanner(onInstall) {
  // Don't show if already dismissed in this session or previously installed
  if (sessionStorage.getItem('a2hs-dismissed')) return;
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  if (window.navigator.standalone === true) return; // iOS standalone

  const banner = document.createElement('div');
  banner.id = 'a2hs-banner';
  banner.innerHTML = `
    <div class="a2hs-icon">🌿</div>
    <div class="a2hs-text">
      <strong>Lebergott installieren</strong>
      <span>Als App auf dem Home Screen speichern</span>
    </div>
    <button class="a2hs-btn" id="a2hs-install">Installieren</button>
    <button class="a2hs-dismiss" id="a2hs-close" aria-label="Schließen">×</button>
  `;
  document.body.appendChild(banner);

  document.getElementById('a2hs-install').addEventListener('click', () => {
    banner.remove();
    if (onInstall) onInstall();
  });

  document.getElementById('a2hs-close').addEventListener('click', () => {
    banner.remove();
    sessionStorage.setItem('a2hs-dismissed', '1');
  });

  // Auto-dismiss after 12 seconds
  setTimeout(() => {
    if (document.getElementById('a2hs-banner')) {
      banner.remove();
      sessionStorage.setItem('a2hs-dismissed', '1');
    }
  }, 12000);
}

function showIOSHint() {
  // Only for iOS Safari not in standalone mode
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandaloneMode = window.navigator.standalone;
  if (!isIOS || isInStandaloneMode) return;
  if (localStorage.getItem('a2hs-ios-shown')) return;

  const banner = document.createElement('div');
  banner.id = 'a2hs-banner';
  banner.innerHTML = `
    <div class="a2hs-icon">🌿</div>
    <div class="a2hs-text">
      <strong>App installieren</strong>
      <span>Tippe auf <strong style="color:#c5a55a">Teilen</strong> → „Zum Home-Bildschirm"</span>
    </div>
    <button class="a2hs-dismiss" id="a2hs-close" aria-label="Schließen">×</button>
  `;
  document.body.appendChild(banner);

  document.getElementById('a2hs-close').addEventListener('click', () => {
    banner.remove();
    localStorage.setItem('a2hs-ios-shown', '1');
  });

  setTimeout(() => {
    if (document.getElementById('a2hs-banner')) {
      banner.remove();
      localStorage.setItem('a2hs-ios-shown', '1');
    }
  }, 10000);
}

// Listen for the Chrome/Android install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;

  // Show after a short delay so the app has time to render
  setTimeout(() => {
    showA2HSBanner(() => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then(() => {
          deferredInstallPrompt = null;
        });
      }
    });
  }, 3000);
});

// iOS hint — show 4s after load if not yet shown
window.addEventListener('load', () => {
  setTimeout(showIOSHint, 4000);
});

// ── Render ────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
