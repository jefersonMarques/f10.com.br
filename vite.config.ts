import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    host: true,            // acessível na rede/local
    port: 5179,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      clientPort: 5179
    },
    watch: {
      usePolling: true,    // <- chave no WSL/NTFS
      interval: 150        // ajuste fino (100–300ms)
    }
  },
  preview: {
    port: 5179,
    strictPort: true
  }
});
