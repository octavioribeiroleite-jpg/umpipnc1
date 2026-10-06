import { Profiler } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import Secretaria from '@/pages/Secretaria';
import AppShell from '@/components/layout/AppShell';
import { fixture } from './backend';
import '@/index.css';
import '@/interface-system.css';
import '@/responsive-foundation.css';
import '@/mobile-app-shell.css';

const renders: Array<{ phase: string; actualMs: number; committed: number }> = [];
const enterEvents: Array<{ at: number; authInFlight: boolean }> = [];
let settledTimer: ReturnType<typeof setTimeout> | undefined;
let settledAt: number | null = null;
const report = () => {
  const heading = document.querySelector('.ebd-heading h1');
  const home = heading?.textContent === 'Secretaria EBD';
  const synced = Boolean(document.querySelector('.ebd-sync-ok'));
  const op = fixture.operations.at(-1);
  if (op && op.type !== 'pin-renewal') { // Existing Home/data remain mounted during renewal.
    if (home && op.homeMs === undefined) op.homeMs = performance.now() - op.started;
    if (synced && op.dataMs === undefined) op.dataMs = performance.now() - op.started;
  }
  const output = document.getElementById('ebd-login-metrics');
  if (!output) return;
  output.textContent = JSON.stringify({ ...fixture, onChange: undefined, renders, enterEvents, totalRenderCpuMs: renders.reduce((sum, render) => sum + render.actualMs, 0), mountedHome: home, firstDataReady: synced, settledAtMs: settledAt, requestCounts: Object.fromEntries([...new Set(fixture.requests.map(request => request.endpoint))].map(endpoint => [endpoint, fixture.requests.filter(request => request.endpoint === endpoint).length])), limitations: ['Controlled synthetic latency, no production auth speed claim', 'Direct Secretaria route benchmark excludes eager App bundle download/parse', 'No physical PWA or OS lifecycle test'] }, null, 2);
  const state = document.getElementById('ebd-login-settled');
  if (state) { const label = settledAt === null && fixture.requests.length ? 'Rede sintética em andamento' : `Rede sintética estabilizada: ${fixture.requests.length} requests`; if (state.textContent !== label) state.textContent = label; }
  const phase = document.getElementById('ebd-login-phase');
  if (phase) {
    const active = fixture.requests.filter(request => request.ended === undefined);
    const label = active.some(request => request.endpoint.startsWith('auth.')) ? 'Confirmando sessão sintética' : active.some(request => request.endpoint.startsWith('edge.')) ? 'Validando PIN sintético' : active.length ? 'Consultas sintéticas em andamento' : 'Sem request sintético em voo';
    if (phase.textContent !== label) phase.textContent = label;
  }
};
fixture.onChange = () => {
  settledAt = null; clearTimeout(settledTimer);
  if (fixture.requests.every(request => request.ended !== undefined)) settledTimer = setTimeout(() => { settledAt = performance.now(); report(); }, 500);
  report();
};
const observer = new MutationObserver(records => {
  if (records.every(record => (record.target instanceof Element ? record.target : record.target.parentElement)?.closest('#ebd-login-metrics, #ebd-login-settled, #ebd-login-phase'))) return;
  report();
});
observer.observe(document.getElementById('root')!, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
const onEnter = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement) || event.target.placeholder !== 'Seu nome') return;
  enterEvents.push({ at: performance.now(), authInFlight: fixture.requests.some(request => request.endpoint.startsWith('auth.') && request.ended === undefined) });
  report();
};
document.addEventListener('keydown', onEnter, true);
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 86400000, staleTime: 300000, refetchOnWindowFocus: false, retry: failureCount => failureCount < 3, refetchOnReconnect: true } } })}>
    <BrowserRouter><AppShell><Profiler id="Secretaria-real" onRender={(_id, phase, actualMs, _base, _start, committed) => { renders.push({ phase, actualMs, committed }); }}>
      <Routes><Route path="/auth" element={<h1>Saída sintética concluída</h1>} /><Route path="*" element={<Secretaria />} /></Routes>
    </Profiler></AppShell></BrowserRouter><Toaster />
    <aside style={{ position: 'relative', zIndex: 1, margin: '1rem', padding: '1rem', border: '1px solid #aaa', background: '#fff', color: '#222' }}>
      <p>Benchmark isolado · dados fictícios · Edge {fixture.edgeMs} ms · autenticação {fixture.authMs} ms · leituras {fixture.readMs} ms</p>
      <p id="ebd-login-settled">Rede sintética em andamento</p>
      <p id="ebd-login-phase">Sem request sintético em voo</p>
      <button style={{ minHeight: 48, padding: 12 }} onClick={() => { fixture.valid = false; window.dispatchEvent(new Event('ebd-session-expired')); }}>Simular expiração para renovar PIN</button>
      <details><summary style={{ minHeight: 48, padding: 12 }}>Medições locais</summary><pre id="ebd-login-metrics" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 11 }} /></details>
    </aside>
  </QueryClientProvider>,
);
requestAnimationFrame(report);
import.meta.hot?.dispose(() => { observer.disconnect(); clearTimeout(settledTimer); document.removeEventListener('keydown', onEnter, true); });
