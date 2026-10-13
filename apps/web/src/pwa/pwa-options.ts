import type { VitePWAOptions } from 'vite-plugin-pwa';

// Kept in src (not inline in vite.config.ts) so the tests can check what the build will emit.
// Icons are generated from brand/icon.svg by scripts/generate-icons.mjs; see the PWA section of CLAUDE.md.
export const pwaOptions = {
  // The user decides when to load a new version (see PwaUpdatePrompt), so the worker waits instead of activating itself.
  registerType: 'prompt',
  manifest: {
    name: 'Easy Grades',
    short_name: 'Easy Grades',
    description: 'Acompanhe seu curso na UFAM a partir do currículo e do histórico do e-Campus.',
    lang: 'pt-BR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#F4F6FA',
    theme_color: '#1D3FA0',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,woff2,svg,png}'],
    navigateFallback: '/index.html',
    // The API and uploaded PDFs are never app routes, so they never fall back to index.html.
    navigateFallbackDenylist: [/^\/api\//, /\.pdf$/i],
    // Workbox tests a RegExp urlPattern against the full href, so these match the pathname with a function instead.
    runtimeCaching: [
      { urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/'), handler: 'NetworkOnly' },
      { urlPattern: ({ url }) => url.pathname.toLowerCase().endsWith('.pdf'), handler: 'NetworkOnly' },
    ],
  },
} satisfies Partial<VitePWAOptions>;
