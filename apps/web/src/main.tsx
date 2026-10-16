import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyAppearance, readAppearance } from './lib/appearance';
import './styles/index.css';

// The CSP forbids inline scripts, so the stored appearance is applied here, before the first render.
applyAppearance(readAppearance());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
