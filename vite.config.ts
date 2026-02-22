import { defineConfig, Plugin, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

function envConfigPlugin(): Plugin {
  let envVars: Record<string, string> = {};

  return {
    name: 'env-config',
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, 'VITE_');
      envVars = {
        SUPABASE_URL: env.VITE_SUPABASE_URL || '',
        SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY || '',
      };
    },
    writeBundle(options) {
      const outDir = options.dir || 'dist';
      writeFileSync(
        resolve(outDir, 'env-config.js'),
        `window.__ENV_CONFIG__=${JSON.stringify(envVars)};`
      );
    },
    configureServer(server) {
      server.middlewares.use('/env-config.js', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript');
        res.end(`window.__ENV_CONFIG__=${JSON.stringify(envVars)};`);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), envConfigPlugin()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
