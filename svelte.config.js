import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(),
    csrf: {
      trustedOrigins: [
        'https://f10.com.br',
        'https://www.f10.com.br',
        'http://147.93.35.138:5980'
      ]
    },
    alias: {
      $lib: './src/lib',
      $components: './src/lib/components',
      $stores: './src/lib/stores'
    }
  }
};

export default config;
