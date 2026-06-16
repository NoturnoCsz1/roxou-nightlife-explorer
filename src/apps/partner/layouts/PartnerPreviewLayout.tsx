/**
 * PartnerPreviewLayout — Fase 9J
 *
 * Layout interno usado em /admin/partner-preview/*.
 * - Envolve as páginas do Partner Pro com <PartnerProvider/>.
 * - Mostra banner "Beta interno" e sub-navegação entre as seções.
 * - Não cria subdomínio, multi-entry nem rota pública.
 *
 * O gate de acesso (admin Roxou) é garantido pelo AdminLayout pai.
 */
import { NavLink, Outlet } from "react-router-dom";
import { PartnerProvider } from "../contexts/PartnerContext";
import { cn } from "@/lib/utils";

const TABS: Array<{ to: string; label: string; end?: boolean }> = [
  { to: "/admin/partner-preview", label: "Dashboard", end: true },
  { to: "/admin/partner-preview/perfil", label: "Perfil" },
  { to: "/admin/partner-preview/eventos", label: "Eventos" },
  { to: "/admin/partner-preview/reservas", label: "Reservas" },
  { to: "/admin/partner-preview/lista-vip", label: "Lista VIP" },
  { to: "/admin/partner-preview/analytics", label: "Analytics" },
  { to: "/admin/partner-preview/configuracoes", label: "Configurações" },
];

const PartnerPreviewLayout = () => {
  return (
    <PartnerProvider>
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <strong className="font-semibold">Beta interno</strong> — Partner Pro Preview.
          Visível somente para administradores Roxou. Sem subdomínio público.
        </div>

        <nav className="flex flex-wrap gap-1 overflow-x-auto rounded-lg border border-border/40 bg-card/40 p-1">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition",
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </div>
    </PartnerProvider>
  );
};

export default PartnerPreviewLayout;
