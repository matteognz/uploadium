import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'uploadium': path.resolve(__dirname, './src')
    }
  },
  root: 'sample',
  server: {
    port: 8888
  }
});
