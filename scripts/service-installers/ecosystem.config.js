/**
 * PM2 Ecosystem Configuration
 *
 * PM2 is a production process manager for Node.js applications.
 * This config file defines how to run the service with PM2.
 *
 * Installation:
 *   npm install -g pm2
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save  # Save current process list
 *   pm2 startup  # Generate startup script
 *
 * Commands:
 *   pm2 list              - List all processes
 *   pm2 logs              - View logs
 *   pm2 monit             - Monitor processes
 *   pm2 restart all       - Restart all processes
 *   pm2 stop all          - Stop all processes
 *   pm2 delete all        - Delete all processes
 */

module.exports = {
  apps: [
    {
      // Site Manager Agent
      name: 'site-manager-agent',
      script: 'index.js',
      cwd: '/path/to/site-manager-agent', // Update this path
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',

      // Environment variables
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },

      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Advanced settings
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Restart policy
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '10s',
    },

    // Smaug Twitter/X Bookmark Sync (optional)
    {
      name: 'smaug-sync',
      script: 'index.js',
      cwd: '/path/to/smaug', // Update this path
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',

      // Run on a schedule via cron
      cron_restart: '0 */6 * * *', // Every 6 hours

      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },

      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:MeJohnC/MeJohnC.Org.git',
      path: '/var/www/mejohnc',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
    },
  },
};
