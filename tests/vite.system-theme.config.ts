import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const root = process.cwd();
const fixtureIndex = path.resolve(root, 'tests/fixtures/system-theme/index.html');
const replacements = {
  client: 'tests/fixtures/diretoria/backend.ts',
  'ebd-client': 'tests/fixtures/ebd-login/backend.ts',
  'treasury-client': 'tests/fixtures/system-theme/treasury-backend.ts',
};

export default defineConfig({
  envPrefix: 'IPNC_FIXTURE_',
  plugins: [react(), {
    name: 'isolated-system-theme', enforce: 'pre',
    resolveId(id) {
      const match = /(?:^|\/)integrations\/supabase\/(client|ebd-client|treasury-client)(?:\.ts)?$/.exec(id);
      if (match) return path.resolve(root, replacements[match[1] as keyof typeof replacements]);
    },
    transformIndexHtml: { order: 'pre', handler(_html, context) {
      if (path.resolve(context.filename) !== fixtureIndex) return;
      const production = readFileSync(path.resolve(root, 'index.html'), 'utf8');
      const html = production.replace(/\bsrc=(["'])\/src\/main\.tsx\1/, 'src="/tests/fixtures/system-theme/bootstrap.ts"');
      if (html === production) throw new Error('Fixture: production entry could not be replaced');
      return html.replace(/<title>[^<]*<\/title>/, '<title>IPNC — tema local com dados fictícios</title>');
    } },
    configureServer(server) { server.middlewares.use((req, res, next) => {
      const pathname = (req.url || '/').split('?')[0];
      if (/\/(?:rest|auth|functions|storage)\/v1(?:\/|$)|^\/sw\.js$/.test(pathname)) {
        res.statusCode = 403; res.end('Fixture: real backend and service worker blocked'); return;
      }
      if (pathname === '/' || req.headers.accept?.includes('text/html')) req.url = '/tests/fixtures/system-theme/index.html';
      next();
    }); },
  }],
  resolve: { alias: [
    { find: '@/contexts/AuthContext', replacement: path.resolve(root, 'tests/fixtures/diretoria/auth.tsx') },
    ...Object.entries(replacements).map(([name, replacement]) => ({ find: `@/integrations/supabase/${name}`, replacement: path.resolve(root, replacement) })),
    { find: '@', replacement: path.resolve(root, 'src') },
  ] },
  build: { outDir: 'dist/fixtures/system-theme', rollupOptions: { input: fixtureIndex } },
  server: { host: '127.0.0.1', port: 8086, strictPort: true, headers: {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; connect-src 'self' ws://127.0.0.1:8086; worker-src 'none'; frame-src 'self' blob:; form-action 'self'; object-src 'none'; base-uri 'self'",
  } },
  define: { __BUILD_TIME__: JSON.stringify('ISOLATED-THEME-FIXTURE-2026-10-06') },
});
