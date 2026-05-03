import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Maintenance from "./pages/Maintenance";
import Expo2026 from "./pages/Expo2026";
import ExpoNoticia from "./pages/ExpoNoticia";
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
import NoticiasList from "./pages/admin/NoticiasList";
import NoticiaForm from "./pages/admin/NoticiaForm";
import V3Auth from "./pages/v3/V3Auth";
import V3Parceiros from "./pages/v3/V3Parceiros";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Admin — segue funcionando normalmente */}
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
            <Route path="instagram" element={<InstagramAdminPage />} />
            <Route path="editores" element={<Editores />} />
            <Route path="noticias" element={<NoticiasList />} />
            <Route path="noticias/novo" element={<NoticiaForm />} />
            <Route path="noticias/:id/editar" element={<NoticiaForm />} />
          </Route>

          {/* Auth — segue funcionando para login */}
          <Route path="/auth" element={<V3Auth />} />
          <Route path="/auth/*" element={<V3Auth />} />

          {/* Hot site Expo Prudente 2026 — exceção da manutenção */}
          <Route path="/expo2026" element={<Expo2026 />} />
          <Route path="/expo2026/noticia/:slug" element={<ExpoNoticia />} />

          {/* Parceiros V3 — exceção da manutenção */}
          <Route path="/v3/parceiros" element={<V3Parceiros />} />
          <Route path="/parceiros" element={<V3Parceiros />} />

          {/* Tudo o mais cai na tela de manutenção */}
          <Route path="*" element={<Maintenance />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
