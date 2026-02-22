import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";

import Reunioes from "./pages/Reunioes";
import NovaReuniao from "./pages/NovaReuniao";
import ReuniaoDetalhe from "./pages/ReuniaoDetalhe";
import Tarefas from "./pages/Tarefas";
import Calendario from "./pages/Calendario";
import Financas from "./pages/Financas";
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
import NotFound from "./pages/NotFound";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry when offline
        if (!navigator.onLine) return false;
        return failureCount < 3;
      },
      refetchOnReconnect: true,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/reunioes" element={<Reunioes />} />
            <Route path="/reunioes/nova" element={<NovaReuniao />} />
            <Route path="/reunioes/:id" element={<ReuniaoDetalhe />} />
            <Route path="/tarefas" element={<Tarefas />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/financas" element={<Financas />} />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
