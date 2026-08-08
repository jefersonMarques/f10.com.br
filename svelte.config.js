import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const cebracPresentationPath = 'src/routes/apresentacao/cebrac-crm-whatsapp/+page.svelte';
const ignoredCebracUnusedSelectors = [
  '.hero-image-fade',
  '.feature-line-light',
  '.feature-line-dark .feature-icon-green',
  '.distribution-example',
  '.distribution-example > span',
  '.distribution-example > div',
  '.distribution-example strong',
  '.distribution-example-light',
  '.distribution-example-light > span',
  '.distribution-example-light > div',
  '.distribution-example-light strong',
  '.distribution-example-light small',
];

function isKnownCebracUnusedSelectorWarning(warning) {
  if (warning.code !== 'css_unused_selector') return false;

  const filename = (warning.filename ?? '').replaceAll('\\', '/');
  if (!filename.endsWith(cebracPresentationPath)) return false;

  return ignoredCebracUnusedSelectors.some((selector) =>
    warning.message.includes(`"${selector}"`)
  );
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  onwarn(warning, defaultHandler) {
    if (isKnownCebracUnusedSelectorWarning(warning)) return;
    defaultHandler(warning);
  },

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
