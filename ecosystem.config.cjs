module.exports = {
  apps: [
    {
      name: 'golf3d',
      script: './node_modules/wrangler/bin/wrangler.js',
      args: 'dev --config dist/server/wrangler.json --local --persist-to .wrangler/state --ip 127.0.0.1 --port 8787 --inspector-port 0',
      node_args: '--import ./scripts/sites-env.mjs',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 8787,
        DISABLE_SITES_IDENTITY: '1',
        TRUST_PROXY: '1',
        PUBLIC_BASE_URL: 'https://golfhub.cloud',
      },
    },
  ],
};
