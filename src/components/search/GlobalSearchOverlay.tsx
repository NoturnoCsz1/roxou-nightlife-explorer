import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, Calendar, Newspaper, MapPin, Music, Trophy, ChevronRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { searchPublicEvents } from "@modules/discovery/events";
import { searchPublicVenues } from "@modules/discovery/venues";
import { expandQuery, fuzzyScore, normalizeText, type SearchResultItem, type SearchResultType } from "./searchUtils";
import { Highlight, QuickLinkCloud, QUICK_LINKS } from "./Highlight";
import { listEnabledDiscoveryCategories } from "@modules/discovery";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface RawEvent { id: string; slug: string; title: string; image_url?: string | null; venue_name?: string | null; category?: string | null; sub_category?: string | null; description?: string | null; date_time: string; }
interface RawNews { id: string; slug: string; title: string; excerpt?: string | null; cover_image_url?: string | null; category?: string | null; published_at?: string | null; }
interface RawPartner { id: string; slug: string; name: string; type: string; neighborhood?: string | null; logo_url?: string | null; short_description?: string | null; }
interface RawMatch { id: string; slug: string; home_team: string; away_team: string; league_label?: string | null; match_time: string; home_badge?: string | null; }

const CATEGORY_PAGES: Array<{ id: string; title: string; subtitle: string; href: string; keywords: string[] }> = [
/**
 * Onda 24 — Padronização Discovery.
 * Entradas de descoberta são geradas exclusivamente a partir de
 * `listEnabledDiscoveryCategories()`. Nenhuma lista hardcoded aqui.
 * Rota única e oficial: `/descobrir/{slug}`.
 */
const DISCOVERY_ENTRIES: Array<{ id: string; title: string; subtitle: string; href: string; keywords: string[] }> =
  listEnabledDiscoveryCategories().map((c) => ({
    id: `disc-${c.slug}`,
    title: c.title,
    subtitle: `Descobertas · ${c.description}`,
    href: `/descobrir/${c.slug}`,
    keywords: Array.from(
      new Set([c.slug, c.title.toLowerCase(), ...c.slug.split("-")]),
    ),
  }));

const CATEGORY_PAGES: Array<{ id: string; title: string; subtitle: string; href: string; keywords: string[] }> = [
  { id: "cat-pagode", title: "Pagode em Presidente Prudente", subtitle: "Agenda de pagode, samba e rodas", href: "/pagode-em-presidente-prudente", keywords: ["pagode", "samba", "roda"] },
  { id: "cat-funk", title: "Funk em Presidente Prudente", subtitle: "Bailes, MCs e festas funk", href: "/funk-em-presidente-prudente", keywords: ["funk", "baile", "mc"] },
  { id: "cat-sertanejo", title: "Sertanejo em Presidente Prudente", subtitle: "Modão, country e sertanejo", href: "/sertanejo-em-presidente-prudente", keywords: ["sertanejo", "modao", "country"] },
  { id: "cat-musica-ao-vivo", title: "Música ao Vivo em Presidente Prudente", subtitle: "Bares e casas com música ao vivo", href: "/musica-ao-vivo-em-presidente-prudente", keywords: ["musica ao vivo", "show", "ao vivo"] },
  { id: "cat-hoje", title: "O que fazer hoje em Presidente Prudente", subtitle: "Eventos para hoje", href: "/o-que-fazer-em-presidente-prudente-hoje", keywords: ["hoje", "agenda", "o que fazer"] },
  { id: "cat-baladas", title: "Baladas em Presidente Prudente", subtitle: "Festas, clubs e baladas", href: "/baladas-em-presidente-prudente", keywords: ["balada", "festa", "club"] },
  { id: "cat-bares", title: "Bares em Presidente Prudente", subtitle: "Bares, pubs e cervejarias", href: "/bares-em-presidente-prudente", keywords: ["bar", "barzinho", "pub", "cervejaria"] },
  { id: "cat-agenda", title: "Agenda completa", subtitle: "Todos os eventos", href: "/agenda", keywords: ["agenda", "eventos", "todos"] },
  ...DISCOVERY_ENTRIES,
];

let cachedData: {
  events: RawEvent[];
  news: RawNews[];
  partners: RawPartner[];
  matches: RawMatch[];
  fetchedAt: number;
} | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function loadData() {
  if (cachedData && Date.now() - cachedData.fetchedAt < CACHE_TTL) return cachedData;
  const nowIso = new Date().toISOString();
  const [evData, newsRes, partnersData, matchesRes] = await Promise.all([
    searchPublicEvents(500),
    supabase.from("roxou_news").select("id,slug,title,excerpt,cover_image_url,category,published_at").eq("status", "published").order("published_at", { ascending: false }).limit(200),
    searchPublicVenues(300),
    supabase.from("sports_matches").select("id,slug,home_team,away_team,league_label,match_time,home_badge").gte("match_time", nowIso).order("match_time", { ascending: true }).limit(80),
  ]);
  cachedData = {
    events: (evData || []) as unknown as RawEvent[],
    news: (newsRes.data || []) as RawNews[],
    partners: (partnersData || []) as unknown as RawPartner[],
    matches: (matchesRes.data || []) as RawMatch[],
    fetchedAt: Date.now(),
  };
  return cachedData;
}

function logSearch(payload: { query: string; clicked_result?: string; result_type?: string; results_count: number; time_to_click_ms?: number }) {
  try {
    void supabase.from("search_logs").insert({
      query: payload.query.slice(0, 200),
      clicked_result: payload.clicked_result || null,
      result_type: payload.result_type || null,
      results_count: payload.results_count,
      time_to_click_ms: payload.time_to_click_ms ?? null,
    });
  } catch {
    /* noop */
  }
}

const RECENT_KEY = "roxou:search:recent";
function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}
function pushRecent(q: string) {
  const list = [q, ...loadRecent().filter((x) => x !== q)].slice(0, 6);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* noop */ }
}

const SECTION_META: Record<SearchResultType, { label: string; icon: typeof Calendar; color: string; viewAll: string }> = {
  event: { label: "Eventos", icon: Calendar, color: "text-primary", viewAll: "/agenda" },
  news: { label: "Notícias", icon: Newspaper, color: "text-amber-400", viewAll: "/noticias" },
  partner: { label: "Locais", icon: MapPin, color: "text-emerald-400", viewAll: "/parceiros" },
  category: { label: "Categorias", icon: Music, color: "text-fuchsia-400", viewAll: "/agenda" },
  match: { label: "Jogos", icon: Trophy, color: "text-amber-300", viewAll: "/jogos" },
};

export default function GlobalSearchOverlay({ open, onClose }: Props) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [data, setData] = useState<typeof cachedData>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openedAt = useRef<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      openedAt.current = Date.now();
      setTerm("");
      setDebounced("");
      loadData().then(setData);
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 250);
    return () => clearTimeout(t);
  }, [term]);

  // Esc close
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const variants = useMemo(() => expandQuery(debounced), [debounced]);
  const hasQuery = normalizeText(debounced).length >= 2;

  const sections = useMemo<Record<SearchResultType, SearchResultItem[]>>(() => {
    const out: Record<SearchResultType, SearchResultItem[]> = { event: [], news: [], partner: [], category: [], match: [] };
    if (!data || !hasQuery) return out;

    // Events
    for (const e of data.events) {
      const hay = [e.title, e.venue_name, e.category, e.sub_category, e.description].filter(Boolean).join(" ");
      const score = fuzzyScore(hay, variants);
      if (score > 0) out.event.push({ id: e.id, type: "event", title: e.title, subtitle: [e.venue_name, e.category].filter(Boolean).join(" · "), href: `/evento/${e.slug}`, image: e.image_url, score: score + (e.category ? 5 : 0) });
    }
    // News
    for (const n of data.news) {
      const hay = [n.title, n.excerpt, n.category].filter(Boolean).join(" ");
      const score = fuzzyScore(hay, variants);
      if (score > 0) out.news.push({ id: n.id, type: "news", title: n.title, subtitle: n.category || "Notícia", href: `/noticia/${n.slug}`, image: n.cover_image_url, score });
    }
    // Partners
    for (const p of data.partners) {
      const hay = [p.name, p.type, p.neighborhood, p.short_description].filter(Boolean).join(" ");
      const score = fuzzyScore(hay, variants);
      if (score > 0) out.partner.push({ id: p.id, type: "partner", title: p.name, subtitle: [p.type, p.neighborhood].filter(Boolean).join(" · "), href: `/local/${p.slug}`, image: p.logo_url, score });
    }
    // Categories
    for (const c of CATEGORY_PAGES) {
      const hay = [c.title, c.subtitle, ...c.keywords].join(" ");
      const score = fuzzyScore(hay, variants);
      if (score > 0) out.category.push({ id: c.id, type: "category", title: c.title, subtitle: c.subtitle, href: c.href, score: score + 10 });
    }
    // Matches
    for (const m of data.matches) {
      const hay = [m.home_team, m.away_team, m.league_label].filter(Boolean).join(" ");
      const score = fuzzyScore(hay, variants);
      if (score > 0) out.match.push({ id: m.id, type: "match", title: `${m.home_team} × ${m.away_team}`, subtitle: m.league_label || "Jogo", href: `/jogo/${m.slug}`, image: m.home_badge, score });
    }

    (Object.keys(out) as SearchResultType[]).forEach((k) => {
      out[k].sort((a, b) => b.score - a.score);
    });
    return out;
  }, [data, variants, hasQuery]);

  const totalResults = sections.event.length + sections.news.length + sections.partner.length + sections.category.length + sections.match.length;

  // Log empty-result searches (after debounce settles)
  const lastLoggedEmpty = useRef<string>("");
  useEffect(() => {
    if (!hasQuery || !data) return;
    if (totalResults === 0 && lastLoggedEmpty.current !== debounced) {
      lastLoggedEmpty.current = debounced;
      logSearch({ query: debounced, results_count: 0 });
    }
  }, [debounced, totalResults, hasQuery, data]);

  const handleResultClick = useCallback((item: SearchResultItem) => {
    pushRecent(debounced || item.title);
    logSearch({
      query: debounced || item.title,
      clicked_result: item.href,
      result_type: item.type,
      results_count: totalResults,
      time_to_click_ms: Date.now() - openedAt.current,
    });
    onClose();
    navigate(item.href);
  }, [debounced, totalResults, navigate, onClose]);

  if (!open) return null;

  const orderedTypes: SearchResultType[] = ["event", "news", "partner", "category", "match"];

  return (
    <div className="fixed inset-0 z-[100] bg-background/98 backdrop-blur-xl animate-fade-in flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 border-b border-white/10 bg-background/95">
        <button
          type="button"
          onClick={onClose}
          aria-label="Voltar"
          className="shrink-0 p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 focus-within:border-primary/50 focus-within:shadow-[0_0_24px_hsl(var(--v3-neon)/0.35)]">
          <Search className="w-4 h-4 text-primary shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar eventos, locais, notícias..."
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/70"
            autoComplete="off"
            enterKeyHint="search"
          />
          {term && (
            <button
              type="button"
              onClick={() => { setTerm(""); inputRef.current?.focus(); }}
              aria-label="Limpar busca"
              className="shrink-0 p-1 rounded-full hover:bg-white/10"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto pb-[max(env(safe-area-inset-bottom),5rem)]">
        {!hasQuery && <EmptyState onPick={(q) => setTerm(q)} onNavigate={onClose} />}

        {hasQuery && totalResults === 0 && (
          <div className="p-8 text-center animate-fade-in">
            <p className="text-base font-bold text-foreground">Nada encontrado para "{debounced}"</p>
            <p className="text-xs text-muted-foreground mt-1 mb-5">Tente outra palavra ou explore as categorias abaixo.</p>
            <QuickLinkCloud onNavigate={onClose} />
          </div>
        )}

        {hasQuery && totalResults > 0 && (
          <div className="px-3 py-3 space-y-5 animate-fade-in">
            {orderedTypes.map((type) => {
              const list = sections[type];
              if (list.length === 0) return null;
              const meta = SECTION_META[type];
              const Icon = meta.icon;
              const visible = list.slice(0, 5);
              return (
                <section key={type}>
                  <div className="flex items-center justify-between px-1 mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                      <h3 className="font-display font-extrabold text-sm text-foreground">
                        {meta.label}
                      </h3>
                      <span className="text-[10px] font-bold text-muted-foreground bg-white/5 rounded-full px-2 py-0.5">
                        {list.length}
                      </span>
                    </div>
                    {list.length > 5 && (
                      <Link
                        to={meta.viewAll}
                        onClick={onClose}
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
                      >
                        Ver todos <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  <ul className="space-y-1.5">
                    {visible.map((item) => (
                      <li key={`${type}-${item.id}`}>
                        <button
                          type="button"
                          onClick={() => handleResultClick(item)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-primary/10 hover:border-primary/30 transition-all text-left"
                        >
                          <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-muted/30 ring-1 ring-white/10 flex items-center justify-center">
                            {item.image ? (
                              <img src={item.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <Icon className={`w-5 h-5 ${meta.color}`} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground line-clamp-1">
                              <Highlight text={item.title} variants={variants} />
                            </p>
                            {item.subtitle && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1">
                                <Highlight text={item.subtitle} variants={variants} />
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onPick, onNavigate }: { onPick: (q: string) => void; onNavigate: () => void }) {
  const recent = loadRecent();
  return (
    <div className="px-4 py-5 space-y-6 animate-fade-in">
      {recent.length > 0 && (
        <section>
          <h3 className="font-display font-extrabold text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Recentes
          </h3>
          <div className="flex flex-wrap gap-2">
            {recent.map((r) => (
              <button
                key={r}
                onClick={() => onPick(r)}
                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-foreground hover:bg-primary/15 hover:border-primary/40"
              >
                {r}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="font-display font-extrabold text-xs text-muted-foreground uppercase tracking-wider mb-2">
          Em alta
        </h3>
        <div className="grid grid-cols-1 gap-1.5">
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.href}
              to={l.href}
              onClick={onNavigate}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-primary/10 hover:border-primary/30 transition-colors"
            >
              <span className="text-sm font-bold text-foreground">{l.label}</span>
              <ChevronRight className="w-4 h-4 text-primary" />
            </Link>
          ))}
        </div>
      </section>

      <section className="pt-2 border-t border-white/10">
        <p className="text-[11px] text-muted-foreground">
          Dica: experimente buscar por <em className="text-foreground">pagode hoje</em>, <em className="text-foreground">funk</em>, <em className="text-foreground">FEJUPI</em> ou o nome de um bar.
        </p>
      </section>
    </div>
  );
}
