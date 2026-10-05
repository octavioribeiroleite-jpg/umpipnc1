import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
export default defineConfig({ plugins:[react(), {name:'isolated-ebd-access-entry',configureServer(server){server.middlewares.use((req,res,next)=>{
  if(req.url?.split('?')[0]==='/secretaria')req.url=`/tests/fixtures/ebd-back.html${req.url.includes('?')?req.url.slice(req.url.indexOf('?')):''}`;
  next();
});}}], resolve:{alias:{'@':path.resolve(process.cwd(),'src')}}, server:{host:'127.0.0.1',port:4175}, define:{__BUILD_TIME__:JSON.stringify('test'),'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('https://fixture.supabase.co'),'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':JSON.stringify('fixture-public-key')} });
