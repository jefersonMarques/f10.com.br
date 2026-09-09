module.exports = {
  apps: [
    {
      name: "f10.com.br",
      cwd: "/opt/f10.com.br",
      script: "build/index.js",
      env_file: "/opt/f10.com.br/.env.production",
      env: {
        NODE_ENV: "production",
        ORIGIN: "https://f10.com.br",
        BODY_SIZE_LIMIT: "100M",
        F10_HELP_VIDEO_WORKER: "0",
      },
      env_production: {
        NODE_ENV: "production",
        ORIGIN: "https://f10.com.br",
        BODY_SIZE_LIMIT: "100M",
        F10_HELP_VIDEO_WORKER: "0",
      },
    },
    {
      name: "f10-help-video-worker",
      cwd: "/opt/f10.com.br",
      script: "build/index.js",
      env_file: "/opt/f10.com.br/.env.production",
      env: {
        NODE_ENV: "production",
        ORIGIN: "http://127.0.0.1:3101",
        HOST: "127.0.0.1",
        PORT: "3101",
        BODY_SIZE_LIMIT: "100M",
        F10_HELP_VIDEO_WORKER: "1",
      },
      env_production: {
        NODE_ENV: "production",
        ORIGIN: "http://127.0.0.1:3101",
        HOST: "127.0.0.1",
        PORT: "3101",
        BODY_SIZE_LIMIT: "100M",
        F10_HELP_VIDEO_WORKER: "1",
      },
    },
  ],
};
