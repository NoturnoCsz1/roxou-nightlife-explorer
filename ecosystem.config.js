// PM2 ecosystem for Roxou VPS
// Usage:
//   pm2 start ecosystem.config.js --env production
//   pm2 save && pm2 startup systemd
//
// All processes inherit TZ=America/Sao_Paulo and NODE_ENV=production.
// Memory limits trigger graceful restart, not crash. Watch is disabled in prod.

module.exports = {
  apps: [
    {
      name: "roxou-web",
      // Static SPA served by `serve` (or remove and let Nginx serve dist/ directly)
      script: "npx",
      args: "serve -s dist -l 3000",
      cwd: "/var/www/roxou/apps/web",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env_production: {
        NODE_ENV: "production",
        TZ: "America/Sao_Paulo",
        PORT: 3000,
      },
      out_file: "/var/www/roxou/logs/web.out.log",
      error_file: "/var/www/roxou/logs/web.err.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "roxou-api",
      script: "dist/server.js",
      cwd: "/var/www/roxou/apps/api",
      instances: 2,
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "600M",
      env_production: {
        NODE_ENV: "production",
        TZ: "America/Sao_Paulo",
        PORT: 3001,
      },
      out_file: "/var/www/roxou/logs/api.out.log",
      error_file: "/var/www/roxou/logs/api.err.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "roxou-worker",
      script: "dist/worker.js",
      cwd: "/var/www/roxou/apps/api",
      instances: 1, // mantém único para evitar concorrência em FFmpeg/OCR
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1500M",
      kill_timeout: 30000, // espera renders longos
      env_production: {
        NODE_ENV: "production",
        TZ: "America/Sao_Paulo",
        WORKER_CONCURRENCY: 2,
      },
      out_file: "/var/www/roxou/logs/worker.out.log",
      error_file: "/var/www/roxou/logs/worker.err.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "roxou-cron",
      script: "dist/cron.js",
      cwd: "/var/www/roxou/apps/api",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env_production: {
        NODE_ENV: "production",
        TZ: "America/Sao_Paulo",
        API_INTERNAL_URL: "http://127.0.0.1:3001",
      },
      out_file: "/var/www/roxou/logs/cron.out.log",
      error_file: "/var/www/roxou/logs/cron.err.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "roxou-cortes",
      script: "dist/server.js",
      cwd: "/var/www/roxou-cortes",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "2000M",
      kill_timeout: 60000,
      env_production: {
        NODE_ENV: "production",
        TZ: "America/Sao_Paulo",
        PORT: 3010,
      },
      out_file: "/var/www/roxou/logs/cortes.out.log",
      error_file: "/var/www/roxou/logs/cortes.err.log",
      merge_logs: true,
      time: true,
    },
  ],
};
