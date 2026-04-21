import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker
registerSW({ immediate: true });

// Emergency Clear via URL: adding ?clear=true to the URL will reset the app
if (window.location.search.includes('clear=true')) {
  localStorage.clear();
  sessionStorage.clear();
  caches.keys().then(names => {
    for (let name of names) caches.delete(name);
  });
  window.history.replaceState({}, document.title, window.location.pathname);
  setTimeout(() => window.location.reload(), 500);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
