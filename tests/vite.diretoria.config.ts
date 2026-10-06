import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { readFileSync } from 'node:fs';
const root=process.cwd();
const fixtureIndex = path.resolve(root, 'tests/fixtures/diretoria/index.html');
export default defineConfig({
 // Isolated fixture server. This is never the deployment configuration.
 envPrefix:'IPNC_FIXTURE_',
 plugins:[react(),{name:'diretoria-fixture',enforce:'pre',
  resolveId(id){if(/(?:^|\/)integrations\/supabase\/(?:client|ebd-client|treasury-client)(?:\.ts)?$/.test(id))return path.resolve(root,'tests/fixtures/diretoria/backend.ts');},
  transformIndexHtml: { order:'pre', handler(_html, context) {
   if(path.resolve(context.filename)!==fixtureIndex)return;
   // Read on every transform so QA always uses the current real first frame,
   // including its critical CSS, logo preload and overlay outside React's root.
   const productionHtml=readFileSync(path.resolve(root,'index.html'),'utf8');
   const fixtureHtml=productionHtml.replace(/\bsrc=(["'])\/src\/main\.tsx\1/, 'src="/tests/fixtures/diretoria/bootstrap.ts"');
   if(fixtureHtml===productionHtml)throw new Error('Fixture: production HTML entry could not be replaced safely');
   return fixtureHtml.replace(/<title>[^<]*<\/title>/, '<title>IPNC — TESTE LOCAL com dados fictícios</title>');
  }},
  configureServer(server){server.middlewares.use((req,res,next)=>{
   if(/\/(?:rest|auth|functions|storage)\/v1(?:\/|$)|^\/sw\.js(?:\?|$)/.test(req.url||'')){res.statusCode=403;res.end('Fixture: backend and service worker requests are blocked');return;}
   const pathname=(req.url||'/').split('?')[0];
   if(!pathname.startsWith('/__diretoria')&&pathname!=='/tests/fixtures/diretoria/index.html'&&(pathname==='/'||req.headers.accept?.includes('text/html'))){res.statusCode=302;res.setHeader('Location',`/__diretoria${req.url||'/'}`);res.end();return;}
   if(req.url?.startsWith('/__diretoria'))req.url='/tests/fixtures/diretoria/index.html';next();
  });}}],
 resolve:{alias:[
  {find:'@/contexts/AuthContext',replacement:path.resolve(root,'tests/fixtures/diretoria/auth.tsx')},
  {find:'@/integrations/supabase/client',replacement:path.resolve(root,'tests/fixtures/diretoria/backend.ts')},
  {find:'@/integrations/supabase/treasury-client',replacement:path.resolve(root,'tests/fixtures/diretoria/backend.ts')},
  {find:'@/integrations/supabase/ebd-client',replacement:path.resolve(root,'tests/fixtures/diretoria/backend.ts')},
  {find:'@',replacement:path.resolve(root,'src')},
 ]},build:{rollupOptions:{input:fixtureIndex}},server:{host:'127.0.0.1',port:8083,strictPort:true,headers:{
  'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; connect-src 'self' ws://127.0.0.1:8083; worker-src 'none'; frame-src 'self' blob:; form-action 'self'; object-src 'none'; base-uri 'self'",
 }},define:{__BUILD_TIME__:JSON.stringify('ISOLATED-FIXTURE-2026-10-05')}
});
