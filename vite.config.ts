import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    // ✅ GitHub Pages 專案站必加：/<repo-name>/
    base: '/retro-trade/',

    server: {
      port: 3000,
      host: '0.0.0.0',
    },

    plugins: [react()],

    // ⚠️ 先保留你原本寫法（但我下面會教你更正統安全的方式）
    define: {
      // No active environment variables currently used
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});

