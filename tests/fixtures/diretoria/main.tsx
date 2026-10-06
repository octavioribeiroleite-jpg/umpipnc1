import { MemberAccessUnavailable } from '@/components/MemberAccessUnavailable';
import React, { useState } from 'react';
import { emitFixtureRealtime, setFixtureReadFailure } from './backend';
import { StableRefreshBoundary } from '@/components/ui/stable-refresh-boundary';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Routes,Route} from 'react-router-dom';
import {QueryClientProvider,QueryClient} from '@tanstack/react-query';
import {TooltipProvider} from '@/components/ui/tooltip';
import {AuthProvider} from '@/contexts/AuthContext';
import {MembroSessionProvider} from '@/contexts/MembroSessionContext';
import {DiretoriaSessionProvider} from '@/contexts/DiretoriaSessionContext';
import {Toaster} from '@/components/ui/sonner';
import {Toaster as Toasts} from '@/components/ui/toaster';
import {PWAInstallPrompt} from '@/components/PWAInstallPrompt';
import {PageErrorBoundary} from '@/components/PageErrorBoundary';
import AppShell from '@/components/layout/AppShell';
import { startAppOpening } from '@/lib/app-opening';
import '../../../src/index.css';
import '../../../src/responsive-foundation.css';
import '../../../src/camisas-separation.css';
import '../../../src/auth-readability.css';
import '../../../src/society-selector.css';
import '../../../src/identity-confirmation.css';
import '../../../src/interface-system.css';
import { applyFixtureSafeAreas } from '../mobile-safe-area';
import SocietyScreenEnhancer from '@/components/auth/SocietyScreenEnhancer';
import IdentityConfirmationEnhancer from '@/components/auth/IdentityConfirmationEnhancer';
import IdentityFixture from './identity';
import {fixtureRole,fixtureState,fixtureParams} from './options';
import Auth from '@/pages/Auth';
import ResetPassword from '@/pages/ResetPassword';
import NotFound from '@/pages/NotFound';
import PainelPastor from '@/pages/PainelPastor';
import PastorSociedade from '@/pages/PastorSociedade';
import PastorCalendario from '@/pages/PastorCalendario';
import PastorComunicados from '@/pages/PastorComunicados';
import PortalIgreja from '@/pages/PortalIgreja';
import VotePublic from '@/pages/VotePublic';
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
import '../../../src/mobile-app-shell.css';
applyFixtureSafeAreas(fixtureParams);
function BoundaryFixture(){const [pending,setPending]=useState(false);const [draft,setDraft]=useState('Rascunho fictício preservado');return <main className="p-6 space-y-4"><h1>Fixture de atualização visual</h1><p data-qa-browser>{navigator.userAgent}</p><button onClick={()=>setPending(value=>!value)}>{pending?'Concluir atualização':'Simular atualização'}</button><StableRefreshBoundary><label htmlFor="fixture-draft">Rascunho</label><input id="fixture-draft" name="draft" value={draft} onChange={event=>setDraft(event.target.value)}/><button>Botão da superfície</button>{pending&&<span className="animate-spin">Consultando</span>}</StableRefreshBoundary></main>;}
function FixtureControls(){
 const [readFailure,setReadFailure] = useState(fixtureState === 'error');
 const [refetchStatus,setRefetchStatus] = useState('');
 const changeReadFailure = (failed:boolean) => { setFixtureReadFailure(failed); setReadFailure(failed); };
 if(fixtureParams.get('controls')==='0')return null;
 const change=(key:string,value:string)=>{const url=new URL(location.href);url.searchParams.set(key,value);location.assign(url);};
 return <details style={{position:'fixed',right:8,bottom:8,zIndex:1000,maxWidth:'calc(100vw - 16px)',padding:8,border:'1px solid #9e7d27',background:'#fff4cf',color:'#423311',borderRadius:8,fontSize:12}}><summary>TESTE LOCAL · {fixtureRole} · {fixtureState}</summary><p>Dados fictícios; autenticação substituída.</p><label>Perfil <select value={fixtureRole} onChange={e=>change('role',e.target.value)}>{['admin','pastor','diretoria','unauthorized','anonymous'].map(v=><option key={v}>{v}</option>)}</select></label><label> Estado <select value={fixtureState} onChange={e=>change('state',e.target.value)}>{['normal','empty','error','long','loading','opening'].map(v=><option key={v}>{v}</option>)}</select></label><div className="mt-2 flex flex-wrap gap-2"><button type="button" aria-pressed={!readFailure} onClick={()=>changeReadFailure(false)}>Leitura normal</button><button type="button" aria-pressed={readFailure} onClick={()=>changeReadFailure(true)}>Simular falha de leitura</button><button type="button" onClick={async()=>{const count=await emitFixtureRealtime();setRefetchStatus(`${count} callbacks locais disparados`);}}>Disparar refetch local</button></div><p role="status">{refetchStatus || 'Refetch local apenas nas telas com assinatura Realtime.'}</p></details>;
}
const unavailable=<main className="p-6"><h1>Prévia separada</h1><p>EBD e tesouraria usam suas próprias fixtures isoladas. Esta prévia não concede sessão nesses módulos.</p></main>;
const root = document.getElementById('root')!;
const opening = startAppOpening({ root, splash: document.getElementById('ipnc-opening')! });
if (import.meta.hot) import.meta.hot.dispose(() => opening.stop());
createRoot(root).render(<AppShell><PageErrorBoundary><QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><TooltipProvider><BrowserRouter basename="/__diretoria"><AuthProvider><DiretoriaSessionProvider><MembroSessionProvider><Routes>
<Route path="/__boundary" element={<BoundaryFixture/>}/>
<Route path="/__identity" element={<IdentityFixture/>}/>
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
<Route path="/auth" element={<Auth/>}/>
<Route path="/reset-password" element={<ResetPassword/>}/>
<Route path="/pastor" element={<PainelPastor/>}/>
<Route path="/pastor/sociedade/:slug" element={<PastorSociedade/>}/>
<Route path="/pastor/calendario" element={<PastorCalendario/>}/>
<Route path="/pastor/comunicados" element={<PastorComunicados/>}/>
<Route path="/pastor/sugestoes" element={<PastorSugestoes/>}/>
<Route path="/pastor-sugestoes" element={<PastorSugestoes/>}/>
<Route path="/igreja" element={<PortalIgreja/>}/>
<Route path="/vote/:electionId" element={<VotePublic/>}/>
<Route path="/membro" element={<MemberAccessUnavailable/>}/>
<Route path="/secretaria" element={unavailable}/><Route path="/tesouraria" element={unavailable}/>
<Route path="*" element={<NotFound/>}/></Routes><Toaster/><Toasts/><PWAInstallPrompt/><FixtureControls/><SocietyScreenEnhancer/><IdentityConfirmationEnhancer/></MembroSessionProvider></DiretoriaSessionProvider></AuthProvider></BrowserRouter></TooltipProvider></QueryClientProvider></PageErrorBoundary></AppShell>);
