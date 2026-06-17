/**
 * Atalhos /partner/* — mapeiam para o equivalente em /admin/partner-preview/*
 * dentro deste app. Em produção, o Partner Pro real roda em
 * parceiro.roxou.com.br (sub-app standalone).
 *
 * - Logado como admin/partner beta → navega para o preview interno.
 * - Não logado → continua para /admin/central (fluxo normal de login).
 *
 * Não altera as rotas existentes do Partner Pro standalone.
 */
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function PartnerShortcutRedirect() {
  const { user, loading } = useAuth();
  const { pathname, search, hash } = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0612]">
        <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
      </div>
    );
  }

  // /partner          → /admin/partner-preview
  // /partner/eventos  → /admin/partner-preview/eventos
  const sub = pathname.replace(/^\/partner\/?/, "");
  const target = sub
    ? `/admin/partner-preview/${sub}${search}${hash}`
    : `/admin/partner-preview${search}${hash}`;

  if (!user) {
    // Sem sessão: manda para o login admin preservando o destino.
    return <Navigate to={`/admin/central?redirect=${encodeURIComponent(target)}`} replace />;
  }
  return <Navigate to={target} replace />;
}
