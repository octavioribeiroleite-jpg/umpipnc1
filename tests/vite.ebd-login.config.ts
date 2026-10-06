import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const root = process.cwd();
const entry = path.resolve(root, 'tests/fixtures/ebd-login/index.html');
const backend = path.resolve(root, 'tests/fixtures/ebd-login/backend.ts');
const fingerprintPaths = ['src/pages/Secretaria.tsx', 'src/hooks/useEbdSync.ts', 'src/hooks/useBirthdays.ts', 'src/lib/refresh-queue.ts', 'src/contexts/AuthContext.tsx', 'src/App.tsx', 'src/main.tsx', 'src/utils/generateEbdPDF.ts', 'src/integrations/supabase/ebd-client.ts'];

// Isolated benchmark only; never the production or deployment configuration.
export default defineConfig({
  envPrefix: 'IPNC_FIXTURE_',
  plugins: [react(), {
    name: 'ebd-login-benchmark', enforce: 'pre',
    resolveId(id) {
      if (/(?:^|\/)integrations\/supabase\/(?:client|ebd-client|treasury-client)(?:\.ts)?$/.test(id)) return backend;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if ((req.url || '').split('?')[0] === '/__ebd-benchmark-source.json') {
          const hash = createHash('sha256');
          for (const file of fingerprintPaths) hash.update(file).update('\0').update(readFileSync(path.resolve(root, file))).update('\0');
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceHash: hash.digest('hex'), sourceStatus: execFileSync('git', ['status', '--porcelain', '--', ...fingerprintPaths], { cwd: root, encoding: 'utf8' }).trim(), fingerprintPaths }));
          return;
        }
        if (/\/(?:rest|auth|functions|storage)\/v1(?:\/|$)|^\/sw\.js(?:\?|$)/.test(req.url || '')) {
          res.statusCode = 403; res.end('Benchmark: real backend and service workers blocked'); return;
        }
        if ((req.url || '/').split('?')[0] === '/secretaria') req.url = '/tests/fixtures/ebd-login/index.html';
        next();
      });
    },
  }],
  resolve: { alias: [
    { find: '@/integrations/supabase/client', replacement: backend },
    { find: '@/integrations/supabase/ebd-client', replacement: backend },
    { find: '@/integrations/supabase/treasury-client', replacement: backend },
    { find: '@', replacement: path.resolve(root, 'src') },
  ] },
  server: { host: '127.0.0.1', port: 8085, strictPort: true, headers: {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; connect-src 'self' ws://127.0.0.1:8085; worker-src 'none'; frame-src 'self' blob:; form-action 'self'; object-src 'none'; base-uri 'self'",
  } },
  build: { outDir: 'dist/fixtures/ebd-login', rollupOptions: { input: entry } },
  define: { __BUILD_TIME__: JSON.stringify('2026-10-06T12:00:00Z') },
});
