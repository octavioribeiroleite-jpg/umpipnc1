import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Routes,Route} from 'react-router-dom';
import {QueryClientProvider,QueryClient} from '@tanstack/react-query';
import {TooltipProvider} from '@/components/ui/tooltip';
import {AuthProvider} from '@/contexts/AuthContext';
import {DiretoriaSessionProvider} from '@/contexts/DiretoriaSessionContext';
import {Toaster} from '@/components/ui/sonner';
import {Toaster as Toasts} from '@/components/ui/toaster';
import {PageErrorBoundary} from '@/components/PageErrorBoundary';
import '../../../src/index.css';
import '../../../src/responsive-foundation.css';
import '../../../src/camisas-separation.css';
import Index from '@/pages/Index';
import Reunioes from '@/pages/Reunioes';
import NovaReuniao from '@/pages/NovaReuniao';
import ReuniaoDetalhe from '@/pages/ReuniaoDetalhe';
import Tarefas from '@/pages/Tarefas';
import Calendario from '@/pages/Calendario';
import Financas from '@/pages/Financas';
import Camisas from '@/pages/Camisas';
import Arquivos from '@/pages/Arquivos';
import Configuracoes from '@/pages/Configuracoes';
import Usuarios from '@/pages/Usuarios';
import Plenarias from '@/pages/Plenarias';
import PlenariaDetalhe from '@/pages/PlenariaDetalhe';
import DiretoriaComunicados from '@/pages/DiretoriaComunicados';
import Eleicoes from '@/pages/Eleicoes';
import EleicaoDetalhe from '@/pages/EleicaoDetalhe';
import EleicaoApresentar from '@/pages/EleicaoApresentar';
import Dizimos from '@/pages/Dizimos';
import Visitantes from '@/pages/Visitantes';
import Estudos from '@/pages/Estudos';
import Aniversariantes from '@/pages/Aniversariantes';
import PastorSugestoes from '@/pages/PastorSugestoes';
const nativeFetch=window.fetch.bind(window);
window.fetch=(input,init)=>{const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.origin);if(url.hostname.endsWith('.supabase.co'))return Promise.reject(Error('Backend real bloqueado no teste'));return nativeFetch(input,init)};
createRoot(document.getElementById('root')!).render(<PageErrorBoundary><QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><TooltipProvider><BrowserRouter basename="/__diretoria"><AuthProvider><DiretoriaSessionProvider><Routes>
<Route path="/" element={<Index/>}/>
<Route path="/reunioes" element={<Reunioes/>}/>
<Route path="/reunioes/nova" element={<NovaReuniao/>}/>
<Route path="/reunioes/:id" element={<ReuniaoDetalhe/>}/>
<Route path="/tarefas" element={<Tarefas/>}/>
<Route path="/calendario" element={<Calendario/>}/>
<Route path="/financas" element={<Financas/>}/>
<Route path="/camisas" element={<Camisas/>}/>
<Route path="/arquivos" element={<Arquivos/>}/>
<Route path="/configuracoes" element={<Configuracoes/>}/>
<Route path="/usuarios" element={<Usuarios/>}/>
<Route path="/plenarias" element={<Plenarias/>}/>
<Route path="/plenarias/:id" element={<PlenariaDetalhe/>}/>
<Route path="/comunicados" element={<DiretoriaComunicados/>}/>
<Route path="/eleicoes" element={<Eleicoes/>}/>
<Route path="/eleicoes/:id" element={<EleicaoDetalhe/>}/>
<Route path="/eleicao/:id/apresentar" element={<EleicaoApresentar/>}/>
<Route path="/dizimos" element={<Dizimos/>}/>
<Route path="/visitantes" element={<Visitantes/>}/>
<Route path="/estudos" element={<Estudos/>}/>
<Route path="/aniversariantes" element={<Aniversariantes/>}/>
<Route path="/sugestoes" element={<PastorSugestoes/>}/>
<Route path="/auth" element={<h1>Saída confirmada — ambiente de teste</h1>}/></Routes><Toaster/><Toasts/></DiretoriaSessionProvider></AuthProvider></BrowserRouter></TooltipProvider></QueryClientProvider></PageErrorBoundary>);
