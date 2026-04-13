import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    strictPort: true,
    watch: {
      // Some desktop/sandbox environments may miss native fs events.
      // Polling keeps HMR stable.
      usePolling: true,
      interval: 150,
    },
    hmr: {
      overlay: true,
    },
  },
})
