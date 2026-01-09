module.exports = {
  apps: [
    {
      name: "f10.com.br",
      cwd: "/opt/f10.com.br",
      script: "build/index.js",

      // Carrega .env.production
      env_file: "/opt/f10.com.br/.env.production",

      // GARANTE o limite de body do SvelteKit/adapter-node (evita cair no default 512KB)
      // (env_file deveria resolver, mas isso aqui mata qualquer dúvida e override)
      env: {
        NODE_ENV: "production",
        BODY_SIZE_LIMIT: "100M",
      },
    },
  ],
};
