
console.log("[Index] Script started");
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <App />
);

// Fade out the pre-hydration boot splash as soon as React mounts
requestAnimationFrame(() => {
  const splash = document.getElementById('boot-splash');
  if (splash) {
    splash.classList.add('done');
    setTimeout(() => splash.remove(), 500);
  }
});
