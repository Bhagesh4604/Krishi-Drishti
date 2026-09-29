import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['three', 'react', 'react-dom']
    },
    // ── Production build tuning (faster first load) ──────────────
    build: {
      target: 'es2018',            // smaller/faster JS than default es2015 polyfills
      cssCodeSplit: true,          // CSS per async chunk instead of one giant file
      sourcemap: false,            // no .map files shipped to the device
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Split heavyweight libraries into their own cacheable chunks so
          // app updates don't invalidate them, and they load in parallel.
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('three') || id.includes('globe')) return 'vendor-3d';
            if (id.includes('leaflet')) return 'vendor-maps';
            if (id.includes('@google/genai') || id.includes('google-genai')) return 'vendor-genai';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('react')) return 'vendor-react';
            return 'vendor';
          },
        },
      },
    },
  };
});
