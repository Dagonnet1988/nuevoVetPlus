module.exports = {
  apps: [
    {
      name: 'vetplus-backend',
      cwd: '/var/www/vetplus/backend',
      script: 'server-production.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_file: '/var/www/vetplus/backend/.env.production',
      max_memory_restart: '800M',
      restart_delay: 3000,
      watch: false,
      time: true,
      out_file: '/var/log/vetplus/backend-out.log',
      error_file: '/var/log/vetplus/backend-error.log',
      merge_logs: true
    }
  ]
};
