/**
 * /dev/rotas — Navigator próprio do Roxou.
 *
 * Acesso: somente em ambiente de desenvolvimento (import.meta.env.DEV)
 * OU para admin autenticado em produção. Não indexa em SEO.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { APP_ROUTES, groupRoutes, type AppRoute, type AppRouteApp } from "@/config/appRoutes";
import { useAdminProfile } from "@/hooks/useAdminProfile";

const APP_LABEL: Record<AppRouteApp, string> = {
  public: "Roxou pública",
  admin: "Admin",
  partner: "Partner Pro",
  legacy: "Legacy",
};

function useNoIndex() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Dev · Rotas · Roxou";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow,noarchive";
    document.head.appendChild(meta);
    return () => {
      document.title = prevTitle;
      meta.remove();
    };
  }, []);
}

function RouteRow({ r }: { r: AppRoute }) {
  const external = r.externalHost ? `${r.externalHost}${r.path.replace(/^\/partner/, "") || "/"}` : null;
  const href = external ?? r.path;
  const disabled = r.requiresParams;

  return (
    <li className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 transition">
      <span className="text-lg leading-6 w-6 text-center select-none">{r.icon ?? "•"}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white truncate">{r.label}</span>
          {r.requiresParams && (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200">
              params
            </span>
          )}
          {r.hidden && (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/10 text-white/60">
              interna
            </span>
          )}
          {external && (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-200">
              subdomínio
            </span>
          )}
        </div>
        <div className="text-xs text-white/50 font-mono truncate">{r.example ?? r.path}</div>
      </div>
      {disabled && !external ? (
        <span className="text-xs text-white/40 shrink-0">requer parâmetros</span>
      ) : external ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-xs px-2.5 py-1 rounded-md bg-fuchsia-500/20 text-fuchsia-100 hover:bg-fuchsia-500/30 shrink-0"
        >
          abrir ↗
        </a>
      ) : (
        <Link
          to={href}
          className="text-xs px-2.5 py-1 rounded-md bg-white/10 text-white hover:bg-white/20 shrink-0"
        >
          abrir →
        </Link>
      )}
    </li>
  );
}

export default function DevRoutes() {
  useNoIndex();
  const { isAdmin, loading } = useAdminProfile();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"navigable" | "params" | "hidden">("navigable");

  const isDev = import.meta.env.DEV;
  const allowed = isDev || isAdmin;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return APP_ROUTES;
    return APP_ROUTES.filter(
      (r) =>
        r.path.toLowerCase().includes(q) ||
        r.label.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q),
    );
  }, [query]);

  const { navigable, withParams, hidden } = useMemo(() => groupRoutes(filtered), [filtered]);

  if (loading && !isDev) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0612]">
        <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
      </div>
    );
  }
  if (!allowed) return <Navigate to="/" replace />;

  const apps: AppRouteApp[] = ["public", "admin", "partner", "legacy"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0612] to-[#150826] text-white">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-widest text-fuchsia-300/80">Dev tools</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">Navigator interno · Roxou</h1>
          <p className="text-sm text-white/60 mt-2">
            Lista todas as rotas registradas no app, agrupadas por módulo.
            {isDev ? " Acesso liberado em ambiente de desenvolvimento." : " Acesso restrito a admins."}
          </p>
        </header>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar rota, label, módulo..."
            className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-fuchsia-400/60"
          />
          <div className="flex gap-1 rounded-lg bg-white/5 border border-white/10 p-1 text-xs">
            {([
              ["navigable", `Navegáveis (${Object.values(navigable).flat().length})`],
              ["params", `Com params (${withParams.length})`],
              ["hidden", `Internas (${hidden.length})`],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-3 py-1.5 rounded-md transition ${
                  tab === k ? "bg-fuchsia-500/30 text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === "navigable" && (
          <div className="space-y-6">
            {apps.map((app) => {
              const list = navigable[app];
              if (!list.length) return null;
              return (
                <section key={app}>
                  <h2 className="text-sm uppercase tracking-wider text-white/70 mb-2">
                    {APP_LABEL[app]} · {list.length}
                  </h2>
                  <ul className="space-y-2">
                    {list.map((r) => (
                      <RouteRow key={r.path} r={r} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        {tab === "params" && (
          <section>
            <h2 className="text-sm uppercase tracking-wider text-white/70 mb-2">
              Rotas que exigem parâmetros
            </h2>
            <ul className="space-y-2">
              {withParams.map((r) => <RouteRow key={r.path} r={r} />)}
            </ul>
          </section>
        )}

        {tab === "hidden" && (
          <section>
            <h2 className="text-sm uppercase tracking-wider text-white/70 mb-2">
              Rotas internas / redirects / success com token
            </h2>
            <ul className="space-y-2">
              {hidden.map((r) => <RouteRow key={r.path} r={r} />)}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
