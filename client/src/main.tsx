// =============================================================================
// Entry point — the first code that runs in the browser.
// It mounts the React app into <div id="root"> in index.html and wraps it
// in "providers" that every page can use.
// =============================================================================
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { GarageProvider } from './state/garage';
import './index.css'; // Tailwind + our global styles

createRoot(document.getElementById('root')!).render(
  // StrictMode: dev-only extra checks that surface common bugs early.
  <StrictMode>
    {/* BrowserRouter: enables page URLs like /inventory without full page reloads. */}
    <BrowserRouter>
      {/* GarageProvider: shares favorites + compare list with every component. */}
      <GarageProvider>
        <App />
      </GarageProvider>
    </BrowserRouter>
  </StrictMode>,
);
