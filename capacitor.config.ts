import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.krishidrishti.app',
  appName: 'Krishi-Drishti',
  webDir: 'dist',
  plugins: {
    // CapacitorHttp routes ALL fetch/XHR through the native HTTP layer.
    // This bypasses the browser's "Mixed Content" restriction that blocks
    // HTTP requests from an HTTPS (https://localhost) Capacitor page.
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
