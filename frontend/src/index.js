import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/layout.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// ── Suppress harmless ResizeObserver loop warning from browser/CRA overlay ──
// This is a known browser-level warning, not a real error. It fires when
// layout changes happen faster than the observer can process (e.g. sticky
// panels, animated grids). Suppressing it here covers the entire app.
window.addEventListener('error', (e) => {
  if (e.message && e.message.includes('ResizeObserver loop')) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();