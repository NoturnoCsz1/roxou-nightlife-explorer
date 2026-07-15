/**
 * Admin → Descobertas
 *
 * Painel de visualização (read-only) do Discovery Engine e do Feature Engine.
 * Consome exclusivamente:
 *   - listEnabledDiscoveryCategories / DISCOVERY_CATEGORIES  (@modules/discovery)
 *   - FEATURE_CATALOG                                        (@modules/discovery/features)
 *
 * Não altera banco. Não duplica catálogo. Não cria CRUD.
 */
import { Link } from "react-router-dom";
import {
  Compass,
  ExternalLink,
  Building2,
  Sparkles,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  DISCOVERY_CATEGORIES,
  listEnabledDiscoveryCategories,
} from "@modules/discovery";
import { FEATURE_CATALOG } from "@modules/discovery/features";

const STRATEGIC_FEATURES = new Set([
  "area-kids",
  "pet-friendly",
  "happy-hour",
  "musica-ao-vivo",
  "estacionamento",
  "familia",
  "romantico",
]);

export default function AdminDiscovery() {
  const enabledCategories = listEnabledDiscoveryCategories();
  const disabledCategories = DISCOVERY_CATEGORIES.filter((c) => !c.enabled);

  const enabledFeatures = FEATURE_CATALOG.filter((f) => f.enabled);
  const featuresByCategory = enabledCategories.map((c) => ({
    slug: c.slug,
    count: FEATURE_CATALOG.filter(
      (f) => f.enabled && (f.slug === c.slug || c.filters.features?.includes(f.slug)),
    ).length,
  }));
  const countBySlug = new Map(featuresByCategory.map((f) => [f.slug, f.count]));

  const strategicFeatures = enabledFeatures.filter((f) =>
    STRATEGIC_FEATURES.has(f.slug),
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Compass className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl text-foreground">
              Descobertas
            </h1>
            <p className="text-sm text-muted-foreground">
              Discovery Engine + Feature Engine (visualização)
            </p>
          </div>
        </div>
      </header>

      {/* Quick actions */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <Link
          to="/admin/estabelecimentos"
          className="flex items-center gap-2 rounded-xl border border-border/40 bg-card/60 px-3 py-2.5 hover:border-primary/40 transition-colors"
        >
          <Building2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Estabelecimentos</span>
        </Link>
        <a
          href="/descobrir"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl border border-border/40 bg-card/60 px-3 py-2.5 hover:border-primary/40 transition-colors"
        >
          <ExternalLink className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Página pública</span>
        </a>
        <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-card/60 px-3 py-2.5">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">
            {enabledFeatures.length} features ativas
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-card/60 px-3 py-2.5">
          <Compass className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">
            {enabledCategories.length} categorias
          </span>
        </div>
      </section>

      {/* Categorias habilitadas */}
      <section>
        <h2 className="font-display font-extrabold text-lg mb-3">
          Categorias habilitadas
        </h2>
        <div className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40">
            <div className="col-span-4">Título / Slug</div>
            <div className="col-span-3">Rota</div>
            <div className="col-span-2 text-center">Indexável</div>
            <div className="col-span-1 text-center">Features</div>
            <div className="col-span-2 text-right">Pública</div>
          </div>
          {enabledCategories.map((c) => (
            <div
              key={c.slug}
              className="grid grid-cols-12 gap-2 px-3 py-2.5 text-sm border-b border-border/20 last:border-0 items-center"
            >
              <div className="col-span-4 min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {c.title}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {c.slug}
                </p>
              </div>
              <div className="col-span-3 text-xs text-muted-foreground truncate">
                /descobrir/{c.slug}
              </div>
              <div className="col-span-2 flex justify-center">
                {c.indexable ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="col-span-1 text-center text-xs font-bold text-primary">
                {countBySlug.get(c.slug) ?? 0}
              </div>
              <div className="col-span-2 text-right">
                <a
                  href={`/descobrir/${c.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                >
                  Ver <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categorias desabilitadas */}
      {disabledCategories.length > 0 && (
        <section>
          <h2 className="font-display font-extrabold text-lg mb-3">
            Categorias desabilitadas
          </h2>
          <div className="flex flex-wrap gap-2">
            {disabledCategories.map((c) => (
              <span
                key={c.slug}
                className="text-xs px-2.5 py-1 rounded-full border border-border/40 bg-muted/30 text-muted-foreground"
              >
                {c.title} ({c.slug})
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Features estratégicas */}
      <section>
        <h2 className="font-display font-extrabold text-lg mb-3">
          Features estratégicas
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {strategicFeatures.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-card/60 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {f.name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {f.category} · {f.slug}
                </p>
              </div>
              {f.indexable && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Todas as features */}
      <section>
        <h2 className="font-display font-extrabold text-lg mb-3">
          Todas as features ({enabledFeatures.length})
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {enabledFeatures.map((f) => (
            <span
              key={f.id}
              className="text-[11px] px-2 py-1 rounded-full border border-border/40 bg-card/40 text-foreground"
              title={f.description}
            >
              {f.name}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
