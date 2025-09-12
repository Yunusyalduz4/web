module.exports = {
  apps: [
    {
      name: 'randevuo',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/web',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXTAUTH_URL: 'https://randevuo.com',
        NEXT_PUBLIC_APP_URL: 'https://randevuo.com',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        DATABASE_URL: process.env.DATABASE_URL
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXTAUTH_URL: 'https://randevuo.com',
        NEXT_PUBLIC_APP_URL: 'https://randevuo.com'
      },
      post_start: 'sleep 10 && curl -X GET http://localhost:3000/api/health || true',
      kill_timeout: 10000,
      wait_ready: false,
      listen_timeout: 15000,
      log_file: '/var/log/pm2/randevuo.log',
      out_file: '/var/log/pm2/randevuo-out.log',
      error_file: '/var/log/pm2/randevuo-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '30s',
      max_restarts: 5,
      restart_delay: 5000,
      exec_mode: 'fork',
      node_args: '--max-old-space-size=2048',
      merge_logs: true,
      time: true
    }
  ],
  
  deploy: {
    production: {
      user: 'www-data',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/randevuo.git',
      path: '/var/www/web',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
