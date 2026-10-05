import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
const root=process.cwd();
export default defineConfig({plugins:[react()],resolve:{alias:[{find:'@/integrations/supabase/ebd-client',replacement:path.resolve(root,'tests/fixtures/latency-backend.ts')},{find:'@',replacement:path.resolve(root,'src')}]},server:{host:'127.0.0.1',port:8082},define:{__BUILD_TIME__:JSON.stringify('test')}});
