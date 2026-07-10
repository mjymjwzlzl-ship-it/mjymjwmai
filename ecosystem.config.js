module.exports = {
  apps: [
    {
      name: 'arata-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 4000',
      cwd: 'D:\\ARATA',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      min_uptime: '10s',
      max_restarts: 5,
      autorestart: true
    },
    {
      name: 'creator-center',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 4001',
      cwd: 'D:\\ARATA\\creator-center',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4001
      },
      min_uptime: '10s',
      max_restarts: 5,
      autorestart: true
    },
    {
      name: 'admin-center',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 5000',
      cwd: 'D:\\ARATA\\admin-center',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      min_uptime: '10s',
      max_restarts: 5,
      autorestart: true
    },
    {
      name: 'arata-backend',
      script: 'server.js',
      cwd: 'D:\\ARATA\\backend',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      },
      min_uptime: '10s',
      max_restarts: 5,
      autorestart: true
    }
  ]
}