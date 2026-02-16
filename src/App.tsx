import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import AguardandoPermissao from "./pages/AguardandoPermissao";
import Reunioes from "./pages/Reunioes";
import NovaReuniao from "./pages/NovaReuniao";
import ReuniaoDetalhe from "./pages/ReuniaoDetalhe";
import Tarefas from "./pages/Tarefas";
import Calendario from "./pages/Calendario";
import Financas from "./pages/Financas";
import Arquivos from "./pages/Arquivos";
import Configuracoes from "./pages/Configuracoes";
import Usuarios from "./pages/Usuarios";
import NotFound from "./pages/NotFound";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

const queryClient = new QueryClient();

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
            <Route path="/aguardando-permissao" element={<AguardandoPermissao />} />
            <Route path="/reunioes" element={<Reunioes />} />
            <Route path="/reunioes/nova" element={<NovaReuniao />} />
            <Route path="/reunioes/:id" element={<ReuniaoDetalhe />} />
            <Route path="/tarefas" element={<Tarefas />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/financas" element={<Financas />} />
            <Route path="/arquivos" element={<Arquivos />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/usuarios" element={<Usuarios />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
