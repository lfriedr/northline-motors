// Vite = the dev server + build tool for the React app.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';     // JSX + fast refresh (instant updates as you edit)
import tailwindcss from '@tailwindcss/vite';   // compiles Tailwind classes into CSS

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In development the React app runs on :5173 and the API on :4000.
    // This forwards any /api/... request to the API, so the front-end code can
    // just call fetch('/api/vehicles') in both dev and production.
    proxy: { '/api': 'http://localhost:4000' },
  },
});
