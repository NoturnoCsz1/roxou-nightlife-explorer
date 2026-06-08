import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addHours, isWithinInterval } from "date-fns";
import { isTodaySP, isTomorrowSP, getStartOfTodaySP, getDateKeySP, dateKeySPToAnchorDate, formatDateHeaderSP, getNowInSaoPaulo } from "@/lib/dateUtils";
import { ptBR } from "date-fns/locale";
import { CalendarDays, MapPin, Heart, Camera, Car, Video, Sparkles, Ticket, Tv } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSavedEvents } from "@/hooks/useSavedEvents";
import V3SearchBar from "@/components/v3/V3SearchBar";
import {
  ADMIN_PARTNER_TYPE_OPTIONS,
  PARTNER_MUSIC_STYLE_LABELS,
} from "@/lib/categoryConfig";

const PARTNER_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ADMIN_PARTNER_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

const fmtTime = (d: string) => format(new Date(d), "HH'h'mm", { locale: ptBR });

const categoryIcon = (category?: string | null) => {
  const value = (category || "").toLowerCase();
  if (value.includes("show") || value.includes("música") || value.includes("musica") || value.includes("sertanejo") || value.includes("rock")) return "🎸";
  if (value.includes("bar") || value.includes("gastro") || value.includes("happy")) return "🍹";
  if (value.includes("festival") || value.includes("festa")) return "✨";
  if (value.includes("balada")) return "🪩";
  return "📍";
};


const isEventNow = (dateTime: string) => {
  const start = new Date(dateTime);
  const now = new Date();
  return isWithinInterval(now, { start, end: addHours(start, 4) });
};

/** Retorna true se o evento cai em sexta, sábado ou domingo no fuso America/Sao_Paulo. */
const isWeekendSP = (dateStr: string): boolean => {
  const d = new Date(dateStr);
  const dow = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" }).format(d);
  return dow === "Fri" || dow === "Sat" || dow === "Sun";
};

export default function V3Agenda() {
  const [showShareCard, setShowShareCard] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSaved, toggleSave } = useSavedEvents();

  // Sincroniza ?cat= (canônico) e ?q= (legado) -> activeCategory
  useEffect(() => {
    const cat = searchParams.get("cat");
    if (cat) {
      setActiveCategory(cat);
      return;
    }
    const q = searchParams.get("q");
    if (!q) return;
    const map: Record<string, string> = {
      hoje: "hoje", amanha: "amanha", "amanhã": "amanha",
      "final de semana": "fds", fds: "fds",
      sertanejo: "sertanejo", pagode: "pagode",
      eletronico: "eletronico", "eletrônico": "eletronico",
      funk: "funk", rock: "rock", mpb: "mpb",
      carona: "carona", futebol: "futebol", ingresso: "ingresso",
    };
    const key = map[q.trim().toLowerCase()];
    if (key) setActiveCategory(key);
    else setSearchTerm(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Persiste filtro ativo na URL
  const selectCategory = (key: string) => {
    setSearchTerm("");
    setActiveCategory(key);
    const next = new URLSearchParams(searchParams);
    if (key === "todos") next.delete("cat");
    else next.set("cat", key);
    next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["v3-agenda"],
    queryFn: async () => {
      // Converte para UTC puro (formato "Z") — PostgREST rejeita offset -03:00 diretamente.
      // getStartOfTodaySP() garante que o corte seja a meia-noite civil de SP, não do browser.
      const startOfTodaySPUtc = new Date(getStartOfTodaySP()).toISOString();
      const { data } = await supabase
        .from("events")
        .select(
          "id,slug,title,image_url,date_time,venue_name,address,category,video_url,partner_id,sub_category,ticket_url,featured,transport_reservation_enabled,is_sports_transmission,sports_match_id,partners:partner_id(id,slug,name,logo_url,type,music_style_primary,music_styles_secondary,supports_sports)",
        )
        .eq("status", "published")
        .gte("date_time", startOfTodaySPUtc)
        .order("date_time")
        .limit(100);
      return data || [];
    },
  });

  /* Categorias dinâmicas (a partir dos próprios eventos) */
  const categories = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return ["todos", ...Array.from(set).slice(0, 12)];
  }, [events]);

  const filteredEvents = useMemo(() => {
    let list = events;
    const cat = activeCategory.toLowerCase();

    if (cat === "hoje") {
      list = list.filter((e) => isTodaySP(new Date(e.date_time)));
    } else if (cat === "amanha") {
      list = list.filter((e) => isTomorrowSP(new Date(e.date_time)));
    } else if (cat === "fds") {
      list = list.filter((e) => isWeekendSP(e.date_time));
    } else if (cat === "expo2026") {
      list = list.filter((e) => `${e.title} ${e.venue_name || ""} ${e.category || ""}`.toLowerCase().includes("expo"));
    } else if (cat !== "todos") {
      list = list.filter((e) => {
        const hay = `${e.title} ${e.category || ""} ${(e as any).sub_category || ""}`.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const needle = cat.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return hay.includes(needle);
      });
    }
    const term = searchTerm.trim().toLowerCase();
    if (term.length >= 2) {
      const tokens = term.normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/);
      list = list.filter((e) => {
        const hay = [e.title, e.venue_name, e.category, (e as any).address].join(" ").toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return tokens.every((t) => hay.includes(t));
      });
    }
    return list;
  }, [events, activeCategory, searchTerm]);

  /* Group by date */
  const grouped = useMemo(() => {
    const map = new Map<string, typeof events>();
    filteredEvents.forEach((e) => {
      // Agrupar pela chave civil (YYYY-MM-DD) em America/Sao_Paulo
      const key = getDateKeySP(new Date(e.date_time));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries()).map(([key, evts]) => {
      const anchor = dateKeySPToAnchorDate(key);
      const label = isTodaySP(anchor)
        ? `Hoje, ${formatDateHeaderSP(getNowInSaoPaulo())}`
        : isTomorrowSP(anchor)
        ? `Amanhã, ${formatDateHeaderSP(anchor)}`
        : formatDateHeaderSP(anchor);
      return { key, label, events: evts };
    });
  }, [filteredEvents]);

  const shareGroup =
    grouped.find((g) => isTodaySP(dateKeySPToAnchorDate(g.key))) || grouped[0];

  if (isLoading) {
    return (
      <div className="px-4 pt-6 space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-card border border-border/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="pb-32 pt-4 max-w-5xl mx-auto px-4">
      {/* ===== HEADER GRADIENTE NEON ===== */}
      <div className="relative mb-5 rounded-3xl border border-primary/25 p-5 shadow-[0_0_42px_hsl(var(--v3-neon)/0.18)]">
        <div
          className="absolute inset-0 opacity-90 -z-10 rounded-3xl overflow-hidden"
          style={{
            background:
              "radial-gradient(circle at 20% 0%, hsl(var(--v3-neon)/0.45), transparent 55%), radial-gradient(circle at 90% 100%, hsl(var(--v3-neon-soft)/0.35), transparent 55%), linear-gradient(135deg, hsl(var(--background)), hsl(var(--card)))",
          }}
        />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-primary font-bold mb-2">
              <Sparkles className="w-3 h-3" />
              Curadoria Roxou
            </p>
            <h1
              className="font-display font-black text-3xl leading-tight"
              style={{
                background: "linear-gradient(135deg, hsl(var(--v3-neon)), hsl(var(--v3-neon-soft)), #fff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Agenda Completa
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Linha do tempo dos próximos rolês</p>
          </div>
          <button
            type="button"
            onClick={() => setShowShareCard((value) => !value)}
            className="shrink-0 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold text-primary-foreground v3-neon-hover active:scale-95 transition-transform shadow-[0_0_24px_hsl(var(--v3-neon)/0.4)]"
            style={{ background: "linear-gradient(135deg, hsl(var(--v3-neon)), hsl(var(--v3-neon-soft)))" }}
          >
            <Camera className="w-4 h-4" />
            Stories
          </button>
        </div>

        {/* SEARCH BAR — limitada para não esticar em ultra-wide */}
        <div className="mt-4 max-w-[600px]">
          <V3SearchBar
            events={events as any}
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar evento, local, vibe..."
            fallbackEvent={(events[0] as any) || null}
          />
        </div>

        {/* MENU UNIFICADO — atalhos + categorias dinâmicas, rolagem horizontal full-bleed */}
        <div className="mt-4 -mx-5 px-5 pr-10 flex flex-nowrap overflow-x-auto whitespace-nowrap gap-2 py-2 scrollbar-hide [-webkit-overflow-scrolling:touch] snap-x">
          {[
            { key: "hoje", label: "🔥 Hoje" },
            { key: "amanha", label: "🌅 Amanhã" },
            { key: "fds", label: "🎉 Final de semana" },
            { key: "expo2026", label: "🤠 Expo 2026" },
            { key: "sertanejo", label: "🎸 Sertanejo" },
            { key: "pagode", label: "🥁 Pagode" },
            { key: "open bar", label: "🍺 Open Bar" },
            { key: "eletr", label: "🎧 Eletrônico" },
            { key: "funk", label: "🔊 Funk" },
            { key: "todos", label: "✨ Tudo" },
            ...categories.filter((c) => c !== "todos").map((c) => ({ key: c, label: `${categoryIcon(c)} ${c}` })),
          ].map((chip) => {
            const active = activeCategory.toLowerCase() === chip.key.toLowerCase();
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => { setSearchTerm(""); setActiveCategory(chip.key); }}
                className={`shrink-0 snap-start inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold whitespace-nowrap transition-all ${
                  active
                    ? "text-primary-foreground shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-primary/60"
                    : "border border-border/40 bg-card/50 text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
                style={
                  active
                    ? { background: "linear-gradient(135deg, hsl(var(--v3-neon)), hsl(var(--v3-neon-soft)))" }
                    : undefined
                }
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== STORY CARD ===== */}
      {showShareCard && shareGroup && (
        <div className="mb-5 overflow-hidden rounded-3xl border border-primary/25 shadow-[0_0_36px_hsl(var(--v3-neon)/0.18)] animate-scale-in">
          <div className="relative min-h-[560px] p-5 flex flex-col justify-between bg-[radial-gradient(circle_at_top_left,hsl(var(--v3-neon)/0.34),transparent_34%),linear-gradient(160deg,hsl(var(--background)),hsl(var(--card)),hsl(var(--background)))]">
            <div>
              <div className="flex items-center justify-between gap-3 mb-7">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-primary font-bold">ROXOU AGENDA</p>
                  <h2 className="font-display text-3xl font-black text-foreground capitalize">{shareGroup.label}</h2>
                </div>
                <div className="rounded-2xl border border-primary/25 bg-card/45 px-3 py-2 text-xs font-bold text-primary">Story</div>
              </div>
              <div className="space-y-3">
                {shareGroup.events.slice(0, 7).map((event) => (
                  <div key={event.id} className="rounded-2xl border border-border/35 bg-card/45 p-3 backdrop-blur-xl">
                    <div className="flex items-start gap-3">
                      <span className="rounded-xl bg-primary/15 px-2 py-1 text-xs font-black text-primary">{fmtTime(event.date_time)}</span>
                      <div className="min-w-0">
                        <p className="font-display text-sm font-bold text-foreground line-clamp-1">{event.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{event.venue_name || "Local a confirmar"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-6 text-center text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">roxou.com.br</p>
          </div>
        </div>
      )}

      {grouped.length === 0 && (
        <div className="py-16 text-center">
          <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum evento programado</p>
        </div>
      )}

      {/* ===== TIMELINE ===== */}
      {grouped.map((g) => (
        <div key={g.key} className="mb-6">
          <h2 className="font-display font-semibold text-sm text-primary uppercase tracking-wide mb-3 capitalize flex items-center gap-2">
            <span className="h-1 w-6 rounded-full bg-gradient-to-r from-primary to-transparent" />
            {g.label}
          </h2>
          <div className="relative ml-2 space-y-4 before:absolute before:left-[2.45rem] before:top-3 before:bottom-3 before:w-px before:bg-gradient-to-b before:from-primary/60 before:via-primary/20 before:to-transparent">
            {g.events.map((e: any) => {
              const hasPOV = !!e.video_url;
              const p = e.partners || null;
              const hasCarona = !!e.transport_reservation_enabled;
              const hasTicket = !!e.ticket_url;
              const hasSports = !!e.is_sports_transmission;
              const musicLabel = p?.music_style_primary
                ? PARTNER_MUSIC_STYLE_LABELS[p.music_style_primary] || p.music_style_primary
                : null;
              const typeLabel = p?.type ? PARTNER_TYPE_LABELS[p.type] || p.type : null;

              type Badge = { key: string; label: string; icon: any; className: string };
              const badges: Badge[] = [];
              if (hasCarona) badges.push({ key: "carona", label: "Carona", icon: Car, className: "border-primary/40 bg-primary/15 text-primary" });
              if (hasTicket) badges.push({ key: "ticket", label: "Ingresso", icon: Ticket, className: "border-amber-400/40 bg-amber-400/10 text-amber-300" });
              if (hasSports) badges.push({ key: "sports", label: "Futebol", icon: Tv, className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" });
              if (musicLabel && badges.length < 4) badges.push({ key: "music", label: musicLabel, icon: null, className: "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200" });
              if (typeLabel && badges.length < 4) badges.push({ key: "type", label: typeLabel, icon: null, className: "border-border/40 bg-card/60 text-muted-foreground" });

              const ctaLabel = hasCarona ? "🚗 Carona" : hasTicket ? "🎟 Ingresso" : "Ver evento →";

              return (
                <div key={e.id} className="relative grid grid-cols-[5rem_1fr] gap-3">
                  <div className="relative z-10 flex flex-col items-center pt-3">
                    <span
                      className="rounded-full px-2.5 py-1.5 text-[10px] font-black text-primary-foreground shadow-[0_0_22px_hsl(var(--v3-neon)/0.55)] ring-2 ring-background"
                      style={{ background: "linear-gradient(135deg, hsl(var(--v3-neon)), hsl(var(--v3-neon-soft)))" }}
                    >
                      {fmtTime(e.date_time)}
                    </span>
                    {isEventNow(e.date_time) && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        AO VIVO
                      </span>
                    )}
                  </div>

                  <div className="relative group">
                    <Link
                      to={`/evento/${e.slug}`}
                      className="block rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl transition-all duration-300 hover:border-primary/50 hover:bg-white/[0.07] hover:shadow-[0_0_28px_hsl(var(--v3-neon)/0.35)] active:scale-[0.98]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden shrink-0 bg-muted/30 ring-1 ring-white/10">
                          <img
                            src={e.image_url || "/placeholder.svg"}
                            alt={e.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                          />
                          {hasPOV && (
                            <span className="absolute bottom-1 right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--v3-neon)/0.7)]">
                              <Video className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 pr-8">
                          <h3 className="font-display font-semibold text-sm md:text-base text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            <span className="mr-1.5" aria-hidden="true">{categoryIcon(e.category)}</span>
                            {e.title}
                          </h3>
                          {e.venue_name && (
                            <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                              <MapPin className="w-3 h-3 text-primary" />
                              <span className="text-[11px] truncate">{e.venue_name}</span>
                            </div>
                          )}

                          {badges.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {badges.slice(0, 4).map((b) => {
                                const Icon = b.icon;
                                return (
                                  <span
                                    key={b.key}
                                    className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${b.className}`}
                                  >
                                    {Icon && <Icon className="w-2.5 h-2.5" />}
                                    {b.key === "music" ? `🎵 ${b.label}` : b.key === "type" ? `🍻 ${b.label}` : b.label}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          <div className="mt-2 text-[11px] font-semibold text-primary/90 group-hover:text-primary transition-colors">
                            {ctaLabel}
                          </div>
                        </div>
                      </div>
                    </Link>

                    <button
                      type="button"
                      aria-label={isSaved(e.id) ? "Remover dos salvos" : "Salvar evento"}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleSave(e.id);
                      }}
                      className="absolute top-2 right-2 inline-flex items-center justify-center w-8 h-8 rounded-full border border-border/45 bg-background/70 backdrop-blur-md text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                    >
                      <Heart className={`w-3.5 h-3.5 ${isSaved(e.id) ? "fill-primary text-primary" : ""}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
