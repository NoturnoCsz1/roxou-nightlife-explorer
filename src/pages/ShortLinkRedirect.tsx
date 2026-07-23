/**
 * /r/:slug — SPA fallback redirector.
 *
 * Faz um replace imediato para a Edge Function `r`, que valida o link,
 * registra o clique server-side e responde 302 para o destino real.
 *
 * NOTA: O ideal é que /r/* seja proxyado direto para a Edge Function via Nginx
 * (ver NGINX_ROXOU.conf.example). Este componente é o fallback para quando
 * o request cai no SPA (preview lovable.app ou VPS sem o proxy configurado).
 */
import { useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export default function ShortLinkRedirect() {
  const { slug } = useParams();
  const { search } = useLocation();

  useEffect(() => {
    const clean = (slug ?? "").toLowerCase().trim();
    if (!clean) return;
    const qs = new URLSearchParams(search);
    qs.delete("slug");
    const suffix = qs.toString();
    const url = `${SUPABASE_URL}/functions/v1/r?slug=${encodeURIComponent(clean)}${suffix ? `&${suffix}` : ""}`;
    window.location.replace(url);
  }, [slug, search]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-3">
        <div className="animate-pulse text-sm text-muted-foreground">Redirecionando…</div>
      </div>
    </div>
  );
}
