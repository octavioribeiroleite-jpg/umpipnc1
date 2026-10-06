import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import base from './vite.diretoria.config.ts';

const root = process.cwd();
const index = path.resolve(root, 'tests/fixtures/app-launch/index.html');

// Separate port, entry and storage namespace. Uses the existing fictitious
// application transport while exercising the real production launch controller.
export default defineConfig({
  ...base,
  plugins: [react(), {
    name: 'app-launch-fixture',
    enforce: 'pre',
    resolveId(id) {
      if (/(?:^|\/)integrations\/supabase\/(?:client|ebd-client|treasury-client)(?:\.ts)?$/.test(id)) {
        return path.resolve(root, 'tests/fixtures/diretoria/backend.ts');
      }
    },
    transformIndexHtml: { order: 'pre', handler(_html, context) {
      if (path.resolve(context.filename) !== index) return;
      const html = readFileSync(path.resolve(root, 'index.html'), 'utf8');
      const fixture = html.replace(/\bsrc=(["'])\/src\/main\.tsx\1/, 'src="/tests/fixtures/app-launch/bootstrap.ts"');
      if (fixture === html) throw new Error('Launch fixture entry could not be replaced safely');
      return fixture.replace(/<title>[^<]*<\/title>/, '<title>IPNC — ciclo PWA SIMULADO, dados fictícios</title>');
    } },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (/\/(?:rest|auth|functions|storage)\/v1(?:\/|$)|^\/sw\.js(?:\?|$)/.test(req.url || '')) {
          res.statusCode = 403;
          res.end('Launch fixture: real transports and service worker blocked');
          return;
        }
        const pathname = (req.url || '/').split('?')[0];
        if (!pathname.startsWith('/__diretoria') && pathname !== '/tests/fixtures/app-launch/index.html' && (pathname === '/' || req.headers.accept?.includes('text/html'))) {
          res.statusCode = 302;
          res.setHeader('Location', `/__diretoria${req.url || '/'}`);
          res.end();
          return;
        }
        if (req.url?.startsWith('/__diretoria')) req.url = '/tests/fixtures/app-launch/index.html';
        next();
      });
    },
  }],
  build: { outDir: 'dist/fixtures/app-launch', rollupOptions: { input: index } },
  server: {
    ...base.server,
    port: 8084,
    strictPort: true,
    headers: { 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; connect-src 'self' ws://127.0.0.1:8084; worker-src 'none'; frame-src 'self' blob:; form-action 'self'; object-src 'none'; base-uri 'self'" },
  },
});
