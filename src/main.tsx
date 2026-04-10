import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite HMR WebSocket errors in this environment
const isViteWSError = (err: any) => {
  const msg = typeof err === 'string' ? err : (err?.message || '');
  return msg.includes('WebSocket closed without opened') || msg.includes('failed to connect to websocket');
};

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && isViteWSError(event.reason)) {
    event.preventDefault();
    event.stopPropagation();
  }
});

window.addEventListener('error', (event) => {
  if (event.error && isViteWSError(event.error)) {
    event.preventDefault();
    event.stopPropagation();
  } else if (isViteWSError(event.message)) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
