import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
const root=process.cwd();
export default defineConfig({
 plugins:[react(),{name:'diretoria-fixture',configureServer(server){server.middlewares.use((req,_res,next)=>{if(req.url?.startsWith('/__diretoria'))req.url='/tests/fixtures/diretoria/index.html';next();});}}],
 resolve:{alias:[
  {find:'@/contexts/AuthContext',replacement:path.resolve(root,'tests/fixtures/diretoria/auth.tsx')},
  {find:'@/integrations/supabase/client',replacement:path.resolve(root,'tests/fixtures/diretoria/backend.ts')},
  {find:'@',replacement:path.resolve(root,'src')},
 ]},server:{host:'127.0.0.1',port:4176},define:{__BUILD_TIME__:JSON.stringify('2026-09-27T13:00:00Z')}
});
