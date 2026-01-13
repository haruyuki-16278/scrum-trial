
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: [
      'yjs',
      'y-websocket',
      '@lexical/yjs',
      'lexical',
      '@lexical/react',
      '@lexical/utils',
      '@lexical/selection',
      '@lexical/rich-text',
      '@lexical/plain-text',
      '@lexical/markdown',
      '@lexical/clipboard',
      '@lexical/list',
      '@lexical/link'
    ],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8001',
      '/ws': {
        target: 'ws://localhost:8001',
        ws: true
      },
      '/yjs': {
        target: 'ws://localhost:8001',
        ws: true
      }
    }
  }
})
