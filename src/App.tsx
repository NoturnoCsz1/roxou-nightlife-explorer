import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import EventDetail from "./pages/EventDetail";
import Hoje from "./pages/Hoje";
import Semana from "./pages/Semana";
import Categorias from "./pages/Categorias";
import Salvos from "./pages/Salvos";
import Indica from "./pages/Indica";
import LocalDetail from "./pages/LocalDetail";
import LocalEventos from "./pages/LocalEventos";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/admin/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import Dashboard from "./pages/admin/Dashboard";
import ParceirosList from "./pages/admin/ParceirosList";
import ParceiroForm from "./pages/admin/ParceiroForm";
import EventosList from "./pages/admin/EventosList";
import EventoForm from "./pages/admin/EventoForm";
import EventoBulkForm from "./pages/admin/EventoBulkForm";
import Sugestoes from "./pages/admin/Sugestoes";
import EventouAdmin from "./pages/admin/EventouAdmin";
import InstagramAdminPage from "./pages/admin/InstagramAdmin";
import Editores from "./pages/admin/Editores";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Index />} />
          <Route path="/evento/:slug" element={<EventDetail />} />
          <Route path="/hoje" element={<Hoje />} />
          <Route path="/semana" element={<Semana />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route path="/salvos" element={<Salvos />} />
          <Route path="/indica" element={<Indica />} />
          <Route path="/local/:slug" element={<LocalDetail />} />
          <Route path="/local/:slug/eventos" element={<LocalEventos />} />

          {/* Admin */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="parceiros" element={<ParceirosList />} />
            <Route path="parceiros/novo" element={<ParceiroForm />} />
            <Route path="parceiros/:id/editar" element={<ParceiroForm />} />
            <Route path="eventos" element={<EventosList />} />
            <Route path="eventos/novo" element={<EventoForm />} />
            <Route path="eventos/novo/lote" element={<EventoBulkForm />} />
            <Route path="eventos/:id/editar" element={<EventoForm />} />
            <Route path="sugestoes" element={<Sugestoes />} />
            <Route path="eventou" element={<EventouAdmin />} />
            <Route path="editores" element={<Editores />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
