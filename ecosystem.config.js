module.exports = {
  apps: [
    {
      name: 'web',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/web',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXTAUTH_URL: 'https://randevuo.com',
        NEXT_PUBLIC_APP_URL: 'https://randevuo.com'
      },
      // Server başladıktan sonra cron job'ları başlat
      post_start: 'sleep 10 && curl -X GET http://localhost:3000/api/startup',
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // Log ayarları
      log_file: '/var/log/pm2/randevuo.log',
      out_file: '/var/log/pm2/randevuo-out.log',
      error_file: '/var/log/pm2/randevuo-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Restart ayarları
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      // Cron job'ları her restart'ta başlat
      exec_mode: 'fork'
    }
  ]
};
