import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const proxy = {
  '/api/push': { target: 'http://127.0.0.1:8094', changeOrigin: true },
  '/api': { target: 'http://127.0.0.1:8093', changeOrigin: true },
};
// Filled only when an external HTTPS address is deliberately selected.
const allowedHosts = process.env.PWA_ALLOWED_HOST ? [process.env.PWA_ALLOWED_HOST] : [];
// Preserve Vite's default deny patterns and protect server data stored in this project.
const privateFiles = ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**',
  '**/pocketbase/pb_data/**', '**/pocketbase/pb_backups/**'];

export default defineConfig({
  plugins: [react(), VitePWA({
    strategies: 'injectManifest',
    srcDir: 'src',
    filename: 'sw.ts',
    injectRegister: 'script',
    registerType: 'prompt',
    devOptions: { enabled: false },
    manifest: {
      id: '/', name: 'КИНО — Cinema PWA', short_name: 'КИНО',
      description: 'Афиша кино и сохранённые билеты.',
      lang: 'ru', start_url: '/', scope: '/', display: 'standalone',
      theme_color: '#0b0b0d', background_color: '#0b0b0d',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      shortcuts: [
        {
          name: 'Афиша', url: '/',
          icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
        },
        {
          name: 'Мои билеты', url: '/my-tickets',
          icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
        },
        {
          name: 'Обратная связь', url: '/feedback',
          icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
        },
      ],
    },
    injectManifest: {
      globPatterns: ['**/*.{html,js,css,woff2,svg,png,jpg,jpeg,webp}'],
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    },
  })],
  server: { host: '127.0.0.1', port: 5176, strictPort: true, proxy, allowedHosts, fs: { deny: privateFiles } },
  preview: { host: '127.0.0.1', port: 4176, strictPort: true, proxy, allowedHosts },
});
