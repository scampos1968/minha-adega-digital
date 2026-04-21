import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker
registerSW({ immediate: true });

// Emergency Clear via URL: adding ?clear=true to the URL will reset the app
if (window.location.search.includes('clear=true')) {
  try {
    localStorage.clear();
    sessionStorage.clear();
    if (window.caches) {
      caches.keys().then(names => {
        for (let name of names) caches.delete(name);
      });
    }
    console.log('App reset requested via URL');
    window.history.replaceState({}, document.title, window.location.pathname);
    setTimeout(() => window.location.reload(), 500);
  } catch (e) {
    console.error('Failed to clear cache:', e);
  }
}

// Global error logger for diagnostics
window.onerror = (msg, url, lineNo, columnNo, error) => {
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.bottom = '10px';
  div.style.left = '10px';
  div.style.right = '10px';
  div.style.padding = '10px';
  div.style.backgroundColor = 'rgba(255, 0, 0, 0.9)';
  div.style.color = 'white';
  div.style.zIndex = '99999';
  div.style.fontSize = '10px';
  div.style.borderRadius = '8px';
  div.style.fontFamily = 'monospace';
  div.innerText = `ERROR: ${msg}\nLine: ${lineNo}\nCol: ${columnNo}\nURL: ${url}`;
  document.body.appendChild(div);
  return false;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
