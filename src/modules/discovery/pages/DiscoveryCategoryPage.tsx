/**
 * Onda 10 — Ativação pública do Discovery Engine.
 *
 * Página genérica única que atende TODAS as categorias declarativas
 * de `discoveryCategories`. Consome exclusivamente a superfície
 * pública `@modules/discovery` (sem Supabase, sem repositório interno).
 *
 * Rota: `/descobrir/:categorySlug`
 * Categoria inválida ou desabilitada → 404 real (NotFound).
 */
import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, CalendarDays, ChevronRight, BadgeCheck } from "lucide-react";
import {
  discover,
  getDiscoveryCategoryBySlug,
  listEnabledDiscoveryCategories,
  type DiscoveryResult,
} from "@modules/discovery";
import NotFound from "@/pages/NotFound";

const CANONICAL_ORIGIN = "https://roxou.lovable.app";
/** Mínimo de itens (locais + eventos) para permitir indexação. */
const MIN_INDEXABLE_ITEMS = 6;

function setMeta(name: string, content: string, isProperty = false) {
  const attr = isProperty ? "property" : "name";
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${name}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  return el;
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
  return el;
}

const SkeletonCard = () => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 animate-pulse">
    <div className="h-24 w-full rounded-xl bg-white/10" />
    <div className="mt-3 h-4 w-2/3 rounded bg-white/10" />
    <div className="mt-2 h-3 w-1/2 rounded bg-white/10" />
  </div>
);

const DiscoveryCategoryPage = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const category = getDiscoveryCategoryBySlug(categorySlug);
  const enabledCategories = useMemo(() => listEnabledDiscoveryCategories(), []);

  const query = useQuery<DiscoveryResult>({
    queryKey: ["discovery-category", category?.slug],
    enabled: Boolean(category?.enabled),
    staleTime: 60 * 1000,
    queryFn: () =>
      discover({
        category: category?.slug,
        ...category?.filters,
        limit: 24,
      }),
  });

  const totalItems =
    (query.data?.venues.length ?? 0) + (query.data?.events.length ?? 0);
  const shouldNoIndex =
    !category?.indexable || totalItems < MIN_INDEXABLE_ITEMS;

  useEffect(() => {
    if (!category) return;
    const canonical = `${CANONICAL_ORIGIN}${category.canonicalPath}`;
    const prevTitle = document.title;
    document.title = `${category.title} — Roxou`;
    const metaDesc = setMeta("description", category.description);
    const canonicalEl = setCanonical(canonical);
    const og1 = setMeta("og:title", category.title, true);
    const og2 = setMeta("og:description", category.description, true);
    const og3 = setMeta("og:url", canonical, true);
    const og4 = setMeta("og:type", "website", true);
    const robots = setMeta(
      "robots",
      shouldNoIndex ? "noindex,follow" : "index,follow",
    );
    return () => {
      document.title = prevTitle;
      // Restaurar robots para default indexável ao sair.
      robots.setAttribute("content", "index,follow");
      // Deixamos meta desc/canonical/og para a próxima rota sobrescrever.
      void metaDesc;
      void canonicalEl;
      void og1;
      void og2;
      void og3;
      void og4;
    };
  }, [category, shouldNoIndex]);

  if (!categorySlug || !category || !category.enabled) {
    return <NotFound />;
  }

  const venues = query.data?.venues ?? [];
  const events = query.data?.events ?? [];
  const isLoading = query.isLoading;
  const isError = query.isError;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="mx-auto max-w-4xl px-4 pt-6">
        {/* Breadcrumb simples */}
        <nav
          aria-label="Breadcrumb"
          className="mb-3 flex items-center gap-1 text-xs text-muted-foreground"
        >
          <Link to="/" className="hover:text-foreground">
            Início
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/descobrir" className="hover:text-foreground">
            Descobrir
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{category.title}</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {category.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {category.description}
          </p>
        </header>

        {isError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="mb-2">
              Tivemos um problema ao carregar as recomendações.
            </p>
            <button
              type="button"
              onClick={() => query.refetch()}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {isLoading && (
          <section aria-label="Carregando" className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </section>
        )}

        {!isLoading && !isError && (
          <>
            {venues.length > 0 && (
              <section aria-labelledby="lugares-heading" className="mb-8">
                <h2
                  id="lugares-heading"
                  className="mb-3 text-lg font-semibold tracking-tight"
                >
                  Lugares recomendados
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {venues.map(({ venue, distanceKm }) => (
                    <li key={venue.id}>
                      <Link
                        to={`/local/${venue.slug}`}
                        className="group flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:border-white/20 hover:bg-white/10"
                      >
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white/10">
                          {venue.logoUrl || venue.imageUrl ? (
                            <img
                              src={venue.logoUrl ?? venue.imageUrl ?? ""}
                              alt={venue.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <MapPin className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="truncate text-sm font-semibold">
                              {venue.name}
                            </h3>
                            {venue.verified && (
                              <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                            )}
                          </div>
                          {venue.type && (
                            <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                              {venue.type}
                            </p>
                          )}
                          {venue.neighborhood && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">
                                {venue.neighborhood}
                                {typeof distanceKm === "number" &&
                                  ` · ${distanceKm.toFixed(1)} km`}
                              </span>
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {events.length > 0 && (
              <section aria-labelledby="eventos-heading" className="mb-8">
                <h2
                  id="eventos-heading"
                  className="mb-3 text-lg font-semibold tracking-tight"
                >
                  Eventos relacionados
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {events.map(({ event }) => (
                    <li key={event.id}>
                      <Link
                        to={`/evento/${event.slug}`}
                        className="group flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:border-white/20 hover:bg-white/10"
                      >
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white/10">
                          {event.imageUrl ? (
                            <img
                              src={event.imageUrl}
                              alt={event.title}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <CalendarDays className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-2 text-sm font-semibold">
                            {event.title}
                          </h3>
                          {event.venueName && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {event.venueName}
                            </p>
                          )}
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(event.dateTimeIso).toLocaleDateString(
                              "pt-BR",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {venues.length === 0 && events.length === 0 && (
              <section className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm">
                <p className="text-foreground">
                  Não encontramos opções suficientes nesta categoria agora. Veja
                  outros lugares e eventos da cidade.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to="/agenda"
                    className="rounded-full border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10"
                  >
                    Agenda completa
                  </Link>
                  <Link
                    to="/descobrir"
                    className="rounded-full border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10"
                  >
                    Descobrir
                  </Link>
                </div>
              </section>
            )}
          </>
        )}

        <section aria-labelledby="outras-cats" className="mt-10">
          <h2
            id="outras-cats"
            className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Outras categorias
          </h2>
          <div className="flex flex-wrap gap-2">
            {enabledCategories
              .filter((c) => c.slug !== category.slug)
              .map((c) => (
                <Link
                  key={c.slug}
                  to={`/descobrir/${c.slug}`}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs hover:border-white/30 hover:bg-white/10"
                >
                  {c.title}
                </Link>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DiscoveryCategoryPage;
