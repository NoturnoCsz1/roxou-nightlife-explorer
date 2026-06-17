/**
 * Catálogo central de rotas navegáveis do Roxou.
 *
 * Consumido pelo Navigator interno (/dev/rotas). Não substitui o
 * React Router — apenas descreve rotas para a UI de navegação.
 *
 * Convenção:
 *  - `path` é a URL real do React Router (pode conter :params).
 *  - `requiresParams = true` significa que a rota não é navegável
 *    diretamente sem que se forneça um exemplo.
 *  - `hidden = true` esconde do Navigator (rotas internas, success
 *    pages com token, redirects, etc.).
 *  - `app` agrupa o item no Navigator.
 */
export type AppRouteApp = "public" | "admin" | "partner" | "legacy";

export interface AppRoute {
  path: string;
  label: string;
  description?: string;
  app: AppRouteApp;
  requiresParams?: boolean;
  hidden?: boolean;
  icon?: string;
  /** URL de exemplo para rotas com :params (apenas referência). */
  example?: string;
  /** Host alternativo (ex.: subdomínio Partner Pro). */
  externalHost?: string;
}

const PARTNER_HOST = "https://parceiro.roxou.com.br";

export const APP_ROUTES: AppRoute[] = [
  // ──────────────── Roxou pública (V3) ────────────────
  { path: "/", label: "Home", app: "public", icon: "🏠" },
  { path: "/descobrir", label: "Descobrir", app: "public", icon: "🔎" },
  { path: "/agenda", label: "Agenda", app: "public", icon: "📅" },
  { path: "/perto-de-mim", label: "Perto de mim", app: "public", icon: "📍" },
  { path: "/parceiros", label: "Parceiros", app: "public", icon: "🤝" },
  { path: "/rankings", label: "Rankings", app: "public", icon: "🏆" },
  { path: "/comunidade", label: "Comunidade", app: "public", icon: "💬" },
  { path: "/economize", label: "Economize", app: "public", icon: "💸" },
  { path: "/ia", label: "Roxou IA", app: "public", icon: "✨" },
  { path: "/jogos", label: "Jogos", app: "public", icon: "⚽" },
  { path: "/resultados", label: "Resultados", app: "public", icon: "📊" },
  { path: "/copa-do-mundo-2026", label: "Copa do Mundo 2026", app: "public", icon: "🏆" },
  { path: "/noticias", label: "Notícias", app: "public", icon: "📰" },
  { path: "/transporte", label: "Transporte", app: "public", icon: "🚗" },
  { path: "/motorista", label: "Motorista", app: "public", icon: "🛻" },
  { path: "/meus-pedidos", label: "Meus pedidos", app: "public", icon: "📋" },
  { path: "/cadastro-motorista", label: "Cadastro motorista", app: "public", icon: "📝" },
  { path: "/sobre", label: "Sobre", app: "public", icon: "ℹ️" },
  { path: "/contato", label: "Contato", app: "public", icon: "✉️" },
  { path: "/perfil", label: "Perfil", app: "public", icon: "👤" },
  { path: "/perfil/editar", label: "Editar perfil", app: "public", icon: "✏️" },
  { path: "/bar-do-mes", label: "Bar do Mês", app: "public", icon: "🍻" },
  { path: "/auth", label: "Login", app: "public", icon: "🔐" },
  { path: "/terms", label: "Termos", app: "public" },
  { path: "/privacy", label: "Privacidade", app: "public" },
  { path: "/remover-dados", label: "Remover dados", app: "public" },

  // Rotas com parâmetros (informativas)
  { path: "/evento/:slug", label: "Detalhe do evento", app: "public", requiresParams: true, example: "/evento/exemplo" },
  { path: "/local/:slug", label: "Detalhe do local", app: "public", requiresParams: true, example: "/local/exemplo" },
  { path: "/jogo/:slug", label: "Detalhe do jogo", app: "public", requiresParams: true, example: "/jogo/exemplo" },
  { path: "/tabela/:slug", label: "Tabela do campeonato", app: "public", requiresParams: true },
  { path: "/noticia/:slug", label: "Notícia", app: "public", requiresParams: true },
  { path: "/:landingSlug", label: "Landing SEO", app: "public", requiresParams: true, hidden: true },
  { path: "/:partnerSlug/vip", label: "Lista VIP do parceiro", app: "public", requiresParams: true },
  { path: "/vip/:listSlug", label: "Lista VIP (slug curto)", app: "public", requiresParams: true },

  // Internas
  { path: "/vip/:listSlug/sucesso/:publicToken", label: "Sucesso VIP", app: "public", requiresParams: true, hidden: true },
  { path: "/:partnerSlug/vip/sucesso/:publicToken", label: "Sucesso VIP (legacy)", app: "public", requiresParams: true, hidden: true },
  { path: "/chat/:requestId", label: "Chat de carona", app: "public", requiresParams: true, hidden: true },
  { path: "/pedir-carona", label: "Pedir carona", app: "public", hidden: true },
  { path: "/terms-acceptance", label: "Aceite de termos", app: "public", hidden: true },
  { path: "/seguranca/revisao", label: "Revisão de segurança", app: "public", hidden: true },
  { path: "/manutencao", label: "Manutenção", app: "public", hidden: true },

  // ──────────────── Admin Roxou ────────────────
  { path: "/admin/central", label: "Admin · Login", app: "admin", icon: "🔑" },
  { path: "/admin/dashboard", label: "Admin · Dashboard", app: "admin", icon: "📊" },
  { path: "/admin/eventos", label: "Admin · Eventos", app: "admin", icon: "🎉" },
  { path: "/admin/eventos/novo", label: "Admin · Novo evento", app: "admin" },
  { path: "/admin/eventos/novo/lote", label: "Admin · Bulk eventos", app: "admin", icon: "📦" },
  { path: "/admin/parceiros", label: "Admin · Parceiros", app: "admin", icon: "🤝" },
  { path: "/admin/parceiros/novo", label: "Admin · Novo parceiro", app: "admin" },
  { path: "/admin/estabelecimentos", label: "Admin · Estabelecimentos", app: "admin" },
  { path: "/admin/sugestoes", label: "Admin · Sugestões", app: "admin" },
  { path: "/admin/eventou", label: "Admin · Eventou", app: "admin" },
  { path: "/admin/instagram", label: "Admin · Instagram", app: "admin", icon: "📷" },
  { path: "/admin/radar-ia", label: "Admin · Radar IA", app: "admin", icon: "📡" },
  { path: "/admin/autoreels", label: "Admin · AutoReels", app: "admin", icon: "🎬" },
  { path: "/admin/aura", label: "Admin · Aura", app: "admin", icon: "🌌" },
  { path: "/admin/security", label: "Admin · Segurança", app: "admin", icon: "🛡️" },
  { path: "/admin/jogos", label: "Admin · Jogos", app: "admin" },
  { path: "/admin/editores", label: "Admin · Editores", app: "admin" },
  { path: "/admin/noticias", label: "Admin · Notícias", app: "admin" },
  { path: "/admin/premiacoes", label: "Admin · Premiações", app: "admin" },
  { path: "/admin/artes", label: "Admin · Artes", app: "admin" },
  { path: "/admin/story-agenda", label: "Admin · Story agenda", app: "admin" },
  { path: "/admin/partner-requests", label: "Admin · Solicitações Partner", app: "admin" },
  { path: "/admin/partner-pilot", label: "Admin · Partner Piloto", app: "admin" },
  { path: "/admin/system", label: "Admin · System", app: "admin", icon: "🖥️" },
  { path: "/admin/logs", label: "Admin · Logs", app: "admin", icon: "📜" },

  // Admin com :params
  { path: "/admin/parceiros/:id/editar", label: "Editar parceiro", app: "admin", requiresParams: true, hidden: true },
  { path: "/admin/eventos/:id/editar", label: "Editar evento", app: "admin", requiresParams: true, hidden: true },
  { path: "/admin/noticias/:id/editar", label: "Editar notícia", app: "admin", requiresParams: true, hidden: true },

  // ──────────────── Partner Pro ────────────────
  // Atalhos amigáveis (redirecionam para /admin/partner-preview/* dentro deste app
  // ou para o subdomínio parceiro.roxou.com.br em produção).
  { path: "/partner", label: "Partner · Home", app: "partner", icon: "🏠", externalHost: PARTNER_HOST },
  { path: "/partner/dashboard", label: "Partner · Dashboard", app: "partner", icon: "📊", externalHost: PARTNER_HOST },
  { path: "/partner/eventos", label: "Partner · Eventos", app: "partner", icon: "🎉", externalHost: PARTNER_HOST },
  { path: "/partner/reservas", label: "Partner · Reservas", app: "partner", icon: "🪑", externalHost: PARTNER_HOST },
  { path: "/partner/lista-vip", label: "Partner · Lista VIP", app: "partner", icon: "🎟️", externalHost: PARTNER_HOST },
  { path: "/partner/validator", label: "Partner · Validador QR", app: "partner", icon: "📷", externalHost: PARTNER_HOST },
  { path: "/partner/analytics", label: "Partner · Analytics", app: "partner", icon: "📈", externalHost: PARTNER_HOST },
  { path: "/partner/perfil", label: "Partner · Perfil", app: "partner", icon: "👤", externalHost: PARTNER_HOST },
  { path: "/partner/configuracoes", label: "Partner · Configurações", app: "partner", icon: "⚙️", externalHost: PARTNER_HOST },

  // Preview interno do Partner Pro dentro do admin
  { path: "/admin/partner-preview", label: "Partner Preview · Landing", app: "partner", hidden: true },
  { path: "/admin/partner-preview/dashboard", label: "Partner Preview · Dashboard", app: "partner", hidden: true },
  { path: "/admin/partner-preview/eventos", label: "Partner Preview · Eventos", app: "partner", hidden: true },
  { path: "/admin/partner-preview/reservas", label: "Partner Preview · Reservas", app: "partner", hidden: true },
  { path: "/admin/partner-preview/lista-vip", label: "Partner Preview · Lista VIP", app: "partner", hidden: true },
  { path: "/admin/partner-preview/analytics", label: "Partner Preview · Analytics", app: "partner", hidden: true },
  { path: "/admin/partner-preview/perfil", label: "Partner Preview · Perfil", app: "partner", hidden: true },
  { path: "/admin/partner-preview/configuracoes", label: "Partner Preview · Configurações", app: "partner", hidden: true },
  { path: "/admin/partner-preview/lista-vip/:listId", label: "Partner Preview · Detalhe VIP", app: "partner", requiresParams: true, hidden: true },

  // ──────────────── Legacy (arquivado) ────────────────
  { path: "/archive/legacy-v2", label: "Legacy v2 · Index", app: "legacy", hidden: true },
];

export function groupRoutes(routes: AppRoute[] = APP_ROUTES) {
  const navigable: Record<AppRouteApp, AppRoute[]> = {
    public: [], admin: [], partner: [], legacy: [],
  };
  const withParams: AppRoute[] = [];
  const hidden: AppRoute[] = [];

  for (const r of routes) {
    if (r.hidden) hidden.push(r);
    else if (r.requiresParams) withParams.push(r);
    else navigable[r.app].push(r);
  }
  return { navigable, withParams, hidden };
}
