import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Emergency Clear via URL: adding ?clear=true to the URL will reset the app
if (window.location.search.includes('clear=true')) {
  try {
    localStorage.clear();
    sessionStorage.clear();
    if (window.caches) {
      caches.keys().then(names => {
        for (const name of names) caches.delete(name);
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
window.onerror = (msg, url, lineNo, columnNo) => {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;bottom:10px;left:10px;right:10px;padding:10px;background:rgba(255,0,0,0.9);color:white;z-index:99999;font-size:10px;border-radius:8px;font-family:monospace';
  div.innerText = `ERROR: ${msg}\nLine: ${lineNo} Col: ${columnNo}\nURL: ${url}`;
  document.body.appendChild(div);
  return false;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
