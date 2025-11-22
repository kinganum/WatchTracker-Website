import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [
      react(),
      // Plugin to copy service-worker.js to dist folder
      {
        name: 'copy-service-worker',
        closeBundle() {
          try {
            const distPath = join(process.cwd(), 'dist');
            if (!existsSync(distPath)) {
              mkdirSync(distPath, { recursive: true });
            }
            copyFileSync(
              join(process.cwd(), 'service-worker.js'),
              join(distPath, 'service-worker.js')
            );
          } catch (err) {
            console.warn('Could not copy service-worker.js:', err);
          }
        }
      }
    ],
    publicDir: 'public',
    resolve: {
      // Ensure we use the same React instance from node_modules
      dedupe: ['react', 'react-dom']
    },
    define: {
      // Expose API_KEY to the client-side code via import.meta.env
      // Vite automatically exposes VITE_ prefixed vars, but we also define them explicitly
      'import.meta.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY || ''),
      'import.meta.env.VITE_API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY || ''),
      // Also keep process.env.API_KEY for backward compatibility
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY || ''),
      'process.env.VITE_API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY || '')
    }
  };
});