import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DiretoriaSessionProvider, useDiretoriaSession } from "@/contexts/DiretoriaSessionContext";
import { MembroSessionProvider } from "@/contexts/MembroSessionContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Reunioes from "./pages/Reunioes";
import NovaReuniao from "./pages/NovaReuniao";
import ReuniaoDetalhe from "./pages/ReuniaoDetalhe";
import Tarefas from "./pages/Tarefas";
import Calendario from "./pages/Calendario";
import Financas from "./pages/Financas";
import Camisas from "./pages/Camisas";
import Arquivos from "./pages/Arquivos";
import Configuracoes from "./pages/Configuracoes";
import Usuarios from "./pages/Usuarios";
import Plenarias from "./pages/Plenarias";
import PlenariaDetalhe from "./pages/PlenariaDetalhe";
import PainelPastor from "./pages/PainelPastor";
import PastorSugestoes from "./pages/PastorSugestoes";
import PastorSociedade from "./pages/PastorSociedade";
import PastorCalendario from "./pages/PastorCalendario";
import PastorComunicados from "./pages/PastorComunicados";
import MembroHome from "./pages/MembroHome";
import DiretoriaComunicados from "./pages/DiretoriaComunicados";
import Eleicoes from "./pages/Eleicoes";
import EleicaoDetalhe from "./pages/EleicaoDetalhe";
import VotePublic from "./pages/VotePublic";
import EleicaoApresentar from "./pages/EleicaoApresentar";
import PortalIgreja from "./pages/PortalIgreja";
import Dizimos from "./pages/Dizimos";
import Visitantes from "./pages/Visitantes";
import Estudos from "./pages/Estudos";
import Secretaria from "./pages/Secretaria";
import Aniversariantes from "./pages/Aniversariantes";
import NotFound from "./pages/NotFound";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { UpdateAvailableBanner } from "@/components/UpdateAvailableBanner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24,
      staleTime: 1000 * 60 * 5,
      retry: (failureCount) => {
        if (!navigator.onLine) return false;
        return failureCount < 3;
      },
      refetchOnReconnect: true,
    },
  },
});

function FinancialRoute({ children }: { children: JSX.Element }) {
  const { user, loading, rolesLoaded, isAdmin, isManagement, isPastor } = useAuth();
  const { session: diretoriaSession } = useDiretoriaSession();

  if (loading || !rolesLoaded) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const isAuthenticatedDiretoriaService = Boolean(
    diretoriaSession &&
    user.email?.startsWith('diretoria-') &&
    user.email?.endsWith('@ipnc.local'),
  );

  if (!isAdmin && !isManagement && !isPastor && !isAuthenticatedDiretoriaService) {
    return <Navigate to="/membro" replace />;
  }

  return children;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <UpdateAvailableBanner />
      <PWAInstallPrompt />
      <BrowserRouter>
        <AuthProvider>
          <DiretoriaSessionProvider>
            <MembroSessionProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/reunioes" element={<Reunioes />} />
                <Route path="/reunioes/nova" element={<NovaReuniao />} />
                <Route path="/reunioes/:id" element={<ReuniaoDetalhe />} />
                <Route path="/tarefas" element={<Tarefas />} />
                <Route path="/calendario" element={<Calendario />} />
                <Route path="/financas" element={<FinancialRoute><Financas /></FinancialRoute>} />
                <Route path="/camisas" element={<FinancialRoute><Camisas /></FinancialRoute>} />
                <Route path="/arquivos" element={<Arquivos />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/plenarias" element={<Plenarias />} />
                <Route path="/plenarias/:id" element={<PlenariaDetalhe />} />
                <Route path="/pastor" element={<PainelPastor />} />
                <Route path="/pastor/sociedade/:slug" element={<PastorSociedade />} />
                <Route path="/pastor/calendario" element={<PastorCalendario />} />
                <Route path="/pastor/comunicados" element={<PastorComunicados />} />
                <Route path="/pastor/sugestoes" element={<PastorSugestoes />} />
                <Route path="/pastor-sugestoes" element={<PastorSugestoes />} />
                <Route path="/sugestoes" element={<PastorSugestoes />} />
                <Route path="/comunicados" element={<DiretoriaComunicados />} />
                <Route path="/membro" element={<MembroHome />} />
                <Route path="/eleicoes" element={<Eleicoes />} />
                <Route path="/eleicoes/:id" element={<EleicaoDetalhe />} />
                <Route path="/vote/:electionId" element={<VotePublic />} />
                <Route path="/eleicao/:id/apresentar" element={<EleicaoApresentar />} />
                <Route path="/dizimos" element={<Dizimos />} />
                <Route path="/igreja" element={<PortalIgreja />} />
                <Route path="/visitantes" element={<Visitantes />} />
                <Route path="/estudos" element={<Estudos />} />
                <Route path="/secretaria" element={<Secretaria />} />
                <Route path="/aniversariantes" element={<Aniversariantes />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </MembroSessionProvider>
          </DiretoriaSessionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;