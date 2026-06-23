/**
 * PartnerFab — botão flutuante contextual.
 *
 * Decide ação com base na rota atual:
 *   /              → Nova reserva     (/reservas?new=1)
 *   /reservas/*    → Criar reserva    (/reservas?new=1)
 *   /fila          → Adicionar à fila (/reservas?new=1#fila)
 *   /reservas/equipe → Novo funcionário (event customizado)
 *   /configuracoes/* → Nova configuração (navega a avancado)
 *
 * Posicionado acima do bottom nav (84px + safe-area + 16px).
 */
import { memo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const FAB_EVENT = "partner-fab-action";

export function emitFabClick(scope: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FAB_EVENT, { detail: { scope } }));
}

export function onFabClick(
  scope: string,
  handler: () => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const listener = (e: Event) => {
    const ce = e as CustomEvent<{ scope: string }>;
    if (ce.detail?.scope === scope) handler();
  };
  window.addEventListener(FAB_EVENT, listener);
  return () => window.removeEventListener(FAB_EVENT, listener);
}

interface FabAction {
  label: string;
  scope: string;
  to?: string;
}

function resolveAction(pathname: string): FabAction | null {
  // Listas VIP
  if (pathname.startsWith("/listas/equipe")) {
    return { label: "Novo funcionário", scope: "staff:new" };
  }
  if (pathname.startsWith("/listas/participantes")) {
    return { label: "Adicionar participante", scope: "vip:entry:new" };
  }
  if (pathname.startsWith("/listas/promoters")) {
    return { label: "Novo promoter", scope: "promoter:new" };
  }
  if (pathname.startsWith("/listas/abertas")) {
    return { label: "Criar lista", scope: "vip:new" };
  }
  if (pathname === "/listas" || pathname.startsWith("/listas")) {
    return { label: "Nova lista", scope: "vip:new" };
  }

  // Reservas
  if (pathname.startsWith("/reservas/equipe")) {
    return { label: "Novo funcionário", scope: "staff:new" };
  }
  if (pathname.startsWith("/reservas/tipos")) {
    return { label: "Novo tipo", scope: "type:new" };
  }
  if (pathname.startsWith("/reservas/configuracoes")) {
    return { label: "Nova configuração", scope: "settings:new" };
  }
  if (pathname.startsWith("/reservas")) {
    return { label: "Criar reserva", scope: "reservation:new", to: "/reservas?new=1" };
  }
  if (pathname.startsWith("/fila")) {
    return { label: "Adicionar à fila", scope: "waitlist:new", to: "/reservas#fila" };
  }
  if (pathname === "/" || pathname === "/dashboard") {
    return { label: "Nova reserva", scope: "reservation:new", to: "/reservas?new=1" };
  }
  if (pathname.startsWith("/configuracoes")) {
    return { label: "Nova configuração", scope: "settings:new", to: "/configuracoes/avancado" };
  }
  return null;
}

function PartnerFabImpl() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const action = resolveAction(pathname);
  if (!action) return null;

  const handle = () => {
    if (action.to) navigate(action.to);
    emitFabClick(action.scope);
  };

  return (
    <button
      type="button"
      onClick={handle}
      aria-label={action.label}
      className={cn(
        "md:hidden fixed right-4 z-50",
        "h-14 w-14 rounded-full",
        "bg-gradient-to-br from-violet-500 to-fuchsia-500",
        "text-white shadow-[0_8px_24px_-8px_rgba(168,85,247,0.6)]",
        "flex items-center justify-center",
        "active:scale-95 transition-transform",
      )}
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px + 12px)",
      }}
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}

export const PartnerFab = memo(PartnerFabImpl);
export default PartnerFab;
