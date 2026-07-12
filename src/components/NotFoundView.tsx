import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import SEO from "@/components/SEO";

interface NotFoundViewProps {
  /** Título curto para o cabeçalho da tela. */
  title?: string;
  /** Mensagem explicativa. */
  message?: string;
  /** Título da aba/SEO. */
  seoTitle?: string;
  /** Description SEO. */
  seoDescription?: string;
  /** Canonical explícito. Se omitido, o SEO usa o path atual. */
  canonical?: string;
  /** Links úteis para reduzir bounce. */
  suggestions?: Array<{ label: string; to: string }>;
}

/**
 * Tela padrão para conteúdo inexistente ou removido.
 *
 * ESTRUTURAL — resolve a causa raiz dos Soft 404:
 * - Emite `robots=noindex,follow` para o Google descartar a URL do índice.
 * - Renderiza corpo textual suficiente (evita "página vazia" percebida).
 * - Não faz redirect client-side para outra rota (que gera Soft 404 pois
 *   o Google recebe HTTP 200 no path original mas conteúdo de outra página).
 *
 * Deve ser usada em qualquer página pública que dependa de slug/params:
 *   /local/:slug, /evento/:slug, /:landingSlug, catch-all etc.
 */
export default function NotFoundView({
  title = "Conteúdo não encontrado",
  message = "A página que você tentou acessar não existe mais ou o endereço está incorreto.",
  seoTitle = "Página não encontrada | ROXOU",
  seoDescription = "A página solicitada não foi encontrada na ROXOU. Explore a agenda de eventos, locais e o que fazer em Presidente Prudente.",
  canonical,
  suggestions,
}: NotFoundViewProps) {
  const location = useLocation();

  useEffect(() => {
    // Sinal para eventual middleware/edge que quiser converter em 404 real.
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-http-status", "404");
    }
    return () => {
      if (typeof document !== "undefined") {
        document.documentElement.removeAttribute("data-http-status");
      }
    };
  }, [location.pathname]);

  const links =
    suggestions && suggestions.length > 0
      ? suggestions
      : [
          { label: "Agenda de eventos", to: "/agenda" },
          { label: "Descobrir locais", to: "/descobrir" },
          { label: "Parceiros", to: "/parceiros" },
          { label: "Voltar ao início", to: "/" },
        ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={canonical}
        noindex
      />
      <main className="max-w-md w-full text-center space-y-5">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          404 — Not Found
        </p>
        <h1 className="text-2xl font-black font-display text-foreground">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        <nav aria-label="Sugestões" className="flex flex-wrap gap-2 justify-center pt-2">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-xl bg-card px-3 py-2 text-xs font-semibold text-foreground card-shadow hover:text-primary transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
