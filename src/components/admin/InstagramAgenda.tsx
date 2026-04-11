import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarDays, CheckSquare, Square, CheckCheck, Loader2, Copy,
  Sparkles, Trophy, Image, Star, BadgeCheck, TrendingUp,
  Clock, Filter, Send, FileText, ChevronDown, ChevronUp, Download
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import EventImageGenerator from "./EventImageGenerator";
import { renderEventCard } from "./EventImageGenerator";
import ReelGenerator from "./ReelGenerator";
import { ptBR } from "date-fns/locale";

interface AgendaEvent {
  id: string;
  title: string;
  slug: string;
  date_time: string;
  venue_name: string | null;
  category: string;
  sub_category: string | null;
  image_url: string | null;
  featured: boolean;
  partner_id: string | null;
  description: string | null;
  // computed
  score: number;
  views: number;
  saves: number;
  verifiedPartner: boolean;
}

interface GeneratedOutput {
  mode: "agenda" | "top" | "individual";
  eventId?: string;
  title: string;
  captionFull: string;
  captionShort: string;
  imagePrompt: string;
  events?: AgendaEvent[];
  generatedImageUrl?: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  bar: "🍺", balada: "🪩", festa: "🎉", evento: "📌",
  restaurante: "🍽️", "casa de show": "🎤", futebol: "⚽",
  show: "🎤", festival: "🏟️",
};

const InstagramAgenda = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [outputs, setOutputs] = useState<GeneratedOutput[]>([]);
  const [expandedOutput, setExpandedOutput] = useState<number | null>(null);
  const [bulkGeneratingImages, setBulkGeneratingImages] = useState(false);

  // Filters
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sortBy, setSortBy] = useState<"score" | "time" | "views">("score");

  useEffect(() => { loadTodayEvents(); }, []);

  async function loadTodayEvents() {
    setLoading(true);
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    const [eventsRes, viewsRes, savesRes, partnersRes] = await Promise.all([
      supabase.from("events")
        .select("id, title, slug, date_time, venue_name, category, sub_category, image_url, featured, partner_id, description")
        .eq("status", "published")
        .gte("date_time", startOfDay)
        .lt("date_time", endOfDay)
        .order("date_time"),
      supabase.from("page_views").select("event_id").not("event_id", "is", null),
      supabase.from("saved_events").select("event_id"),
      supabase.from("partners").select("id, verified_partner").eq("active", true),
    ]);

    const rawEvents = eventsRes.data || [];
    const viewMap: Record<string, number> = {};
    (viewsRes.data || []).forEach((v: any) => { if (v.event_id) viewMap[v.event_id] = (viewMap[v.event_id] || 0) + 1; });
    const saveMap: Record<string, number> = {};
    (savesRes.data || []).forEach((s: any) => { if (s.event_id) saveMap[s.event_id] = (saveMap[s.event_id] || 0) + 1; });
    const verifiedMap = new Set((partnersRes.data || []).filter((p: any) => p.verified_partner).map((p: any) => p.id));

    // Top views threshold (top 30%)
    const allViews = Object.values(viewMap).sort((a, b) => b - a);
    const topThreshold = allViews[Math.floor(allViews.length * 0.3)] || 1;

    const scored: AgendaEvent[] = rawEvents.map((e: any) => {
      const views = viewMap[e.id] || 0;
      const saves = saveMap[e.id] || 0;
      const isVerified = e.partner_id ? verifiedMap.has(e.partner_id) : false;
      const hour = new Date(e.date_time).getHours();
      const isPrimeTime = hour >= 20 || hour <= 4;

      let score = 0;
      if (e.featured) score += 4;
      if (isVerified) score += 3;
      if (views >= topThreshold) score += 2;
      if (isPrimeTime) score += 1;
      if (e.image_url) score += 1;
      if (isVerified) score += 1;

      return { ...e, score, views, saves, verifiedPartner: isVerified };
    });

    setEvents(scored);
    setSelected(new Set(scored.map(e => e.id)));
    setLoading(false);
  }

  const filteredEvents = useMemo(() => {
    let list = [...events];
    if (onlyFeatured) list = list.filter(e => e.featured);
    if (onlyVerified) list = list.filter(e => e.verifiedPartner);
    list.sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "views") return b.views - a.views;
      return new Date(a.date_time).getTime() - new Date(b.date_time).getTime();
    });
    return list;
  }, [events, onlyFeatured, onlyVerified, sortBy]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filteredEvents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredEvents.map(e => e.id)));
    }
  };

  const selectedEvents = useMemo(() =>
    filteredEvents.filter(e => selected.has(e.id)).sort((a, b) => b.score - a.score),
    [filteredEvents, selected]
  );

  const todayStr = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const todayShort = format(new Date(), "dd/MM");

  // ========== GENERATION ==========

  function generateAgenda(): GeneratedOutput {
    const top = selectedEvents.slice(0, 10);
    const lines = top.map((e, i) => {
      const h = format(new Date(e.date_time), "HH'h'mm");
      const emoji = CATEGORY_EMOJI[e.category] || "📌";
      return `${emoji} ${e.title}\n🕐 ${h}${e.venue_name ? ` · 📍 ${e.venue_name}` : ""}`;
    }).join("\n\n");

    const captionFull = `📅 AGENDA DE HOJE — ${todayStr}\n\nConfira o que rola hoje na cidade:\n\n${lines}\n\n👉 Mais info e ingressos em roxou.com.br\n\nSalva esse post pra não esquecer! 🔖`;

    const captionShort = `📅 Agenda de hoje na Roxou!\n\n${top.slice(0, 5).map(e => {
      const h = format(new Date(e.date_time), "HH'h'");
      return `• ${e.title} — ${h}`;
    }).join("\n")}\n\n👉 roxou.com.br`;

    const imagePrompt = `Instagram post 1:1, premium dark background (#1a1a2e), neon magenta/pink highlights (#e91e8c). Title "AGENDA DE HOJE" in bold white. Date "${todayShort}" prominent. List ${Math.min(top.length, 6)} event names in clean grid layout. Bottom: "roxou.com.br" with ROXOU logo. Nightlife aesthetic, modern typography, mobile-first.`;

    return { mode: "agenda", title: "Agenda do Dia", captionFull, captionShort, imagePrompt, events: top };
  }

  function generateTop(): GeneratedOutput {
    const top = selectedEvents.slice(0, 5);
    const ranked = top.map((e, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`;
      const h = format(new Date(e.date_time), "HH'h'mm");
      return `${medal} ${e.title}\n🕐 ${h}${e.venue_name ? ` · ${e.venue_name}` : ""}${e.featured ? " ⭐" : ""}`;
    }).join("\n\n");

    const captionFull = `🏆 TOP ROLÊS DE HOJE\n\nOs eventos mais quentes de ${todayStr}:\n\n${ranked}\n\n🔥 Não fique de fora!\n👉 Garanta sua presença — mais info na Roxou!\n\nroxou.com.br`;

    const captionShort = `🏆 Top ${top.length} de hoje na Roxou!\n\n${top.slice(0, 3).map((e, i) => `${i + 1}. ${e.title}`).join("\n")}\n\n👉 roxou.com.br`;

    const imagePrompt = `Instagram post 1:1, premium dark background (#1a1a2e), neon magenta/pink glow (#e91e8c). Title "TOP ROLÊS DE HOJE" bold. Ranking layout: gold #1 highlighted large, silver #2, bronze #3. ${top.slice(0, 3).map((e, i) => `#${i + 1}: "${e.title}"`).join(", ")}. ROXOU logo bottom-right. Nightlife ranking aesthetic, strong contrast, modern.`;

    return { mode: "top", title: "Top Rolês de Hoje", captionFull, captionShort, imagePrompt, events: top };
  }

  function generateIndividual(event: AgendaEvent): GeneratedOutput {
    const h = format(new Date(event.date_time), "HH'h'mm");
    const dayFull = format(new Date(event.date_time), "EEEE, d 'de' MMMM", { locale: ptBR });
    const emoji = CATEGORY_EMOJI[event.category] || "🎉";

    const captionFull = `${emoji} ${event.title.toUpperCase()}\n\nHoje tem! Não perca:\n\n📅 ${dayFull}\n🕐 ${h}\n📍 ${event.venue_name || "Local a confirmar"}\n${event.sub_category ? `🎵 ${event.sub_category}` : ""}\n\n${event.description ? event.description.slice(0, 150) + (event.description.length > 150 ? "..." : "") : ""}\n\n👉 Garanta sua presença — mais info no ROXOU!\n\nroxou.com.br`;

    const captionShort = `${emoji} Hoje: ${event.title}\n🕐 ${h}${event.venue_name ? ` · 📍 ${event.venue_name}` : ""}\n\n👉 roxou.com.br`;

    const imagePrompt = `Instagram post 1:1, premium dark background (#1a1a2e), neon magenta/pink accent (#e91e8c). Event title "${event.title}" bold and large. Time "${h}" and venue "${event.venue_name || ""}" below. Category badge "${event.category}". ${event.image_url ? `Use reference event image.` : "Abstract nightlife visual."} ROXOU logo watermark. CTA "roxou.com.br". Modern nightlife aesthetic.`;

    return { mode: "individual", eventId: event.id, title: event.title, captionFull, captionShort, imagePrompt };
  }

  async function handleGenerate(mode: "agenda" | "top" | "individual" | "all") {
    if (selectedEvents.length === 0) {
      toast.error("Selecione pelo menos um evento");
      return;
    }
    setGenerating(true);
    setOutputs([]);

    const results: GeneratedOutput[] = [];

    if (mode === "agenda" || mode === "all") {
      results.push(generateAgenda());
    }
    if (mode === "top" || mode === "all") {
      results.push(generateTop());
    }
    if (mode === "individual" || mode === "all") {
      selectedEvents.forEach(e => results.push(generateIndividual(e)));
    }

    // Save to content_generations
    for (const r of results) {
      await supabase.from("content_generations" as any).insert({
        type: "post",
        source_type: `agenda_${r.mode}`,
        source_id: r.eventId || null,
        title: r.title,
        generated_text: r.captionFull,
      } as any);
    }

    setOutputs(results);
    setExpandedOutput(0);
    setGenerating(false);
    toast.success(`${results.length} conteúdo(s) gerado(s)!`);
  }

  function copyText(text: string, label = "Copiado!") {
    navigator.clipboard.writeText(text);
    toast.success(label);
  }

  function sendToInstagramDraft(output: GeneratedOutput) {
    const params = new URLSearchParams();
    params.set("caption", output.captionFull);
    if (output.eventId) {
      const ev = events.find(e => e.id === output.eventId);
      if (ev?.image_url) params.set("image", ev.image_url);
    }
    navigate(`/admin/instagram?tab=publicacao&${params.toString()}`);
  }

  // ========== RENDER ==========

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          Instagram Agenda
        </h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Gere posts padronizados da agenda de hoje da Roxou · {todayStr}
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border/40 bg-card p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
          <Filter className="h-3 w-3" /> Filtros
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setOnlyFeatured(!onlyFeatured)}
            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium transition ${onlyFeatured ? "bg-yellow-400/20 text-yellow-500" : "bg-secondary/40 text-muted-foreground hover:text-foreground"}`}
          >
            <Star className="h-3 w-3" /> Destaques
          </button>
          <button
            onClick={() => setOnlyVerified(!onlyVerified)}
            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium transition ${onlyVerified ? "bg-green-400/20 text-green-500" : "bg-secondary/40 text-muted-foreground hover:text-foreground"}`}
          >
            <BadgeCheck className="h-3 w-3" /> Verificados
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[9px] text-muted-foreground self-center mr-1">Ordenar:</span>
          {([
            { v: "score" as const, l: "Score", icon: TrendingUp },
            { v: "time" as const, l: "Horário", icon: Clock },
            { v: "views" as const, l: "Acessos", icon: TrendingUp },
          ]).map(o => (
            <button
              key={o.v}
              onClick={() => setSortBy(o.v)}
              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium transition ${sortBy === o.v ? "bg-primary/20 text-primary" : "bg-secondary/30 text-muted-foreground hover:text-foreground"}`}
            >
              <o.icon className="h-3 w-3" /> {o.l}
            </button>
          ))}
        </div>
      </div>

      {/* Event Selection */}
      <div className="rounded-xl border border-border/40 bg-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
            Eventos de hoje ({filteredEvents.length})
          </span>
          <button onClick={toggleAll} className="flex items-center gap-1 text-[10px] text-primary font-semibold">
            <CheckCheck className="h-3 w-3" />
            {selected.size === filteredEvents.length ? "Desmarcar tudo" : "Selecionar tudo"}
          </button>
        </div>

        {filteredEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhum evento publicado para hoje.</p>
        ) : (
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {filteredEvents.map((e, i) => {
              const isSelected = selected.has(e.id);
              const h = format(new Date(e.date_time), "HH:mm");
              return (
                <div
                  key={e.id}
                  onClick={() => toggleSelect(e.id)}
                  className={`flex items-start gap-2 rounded-lg p-2.5 cursor-pointer transition border ${isSelected ? "border-primary/30 bg-primary/5" : "border-transparent bg-card/50 hover:bg-secondary/30"}`}
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                  )}

                  {e.image_url && (
                    <img src={e.image_url} alt="" className="h-10 w-10 rounded-md object-cover shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{e.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">{h}</span>
                      {e.venue_name && <span className="text-[10px] text-muted-foreground">· {e.venue_name}</span>}
                      <span className="text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded-full text-muted-foreground">{e.category}</span>
                    </div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {e.featured && (
                        <span className="text-[9px] bg-yellow-400/15 text-yellow-500 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5" /> destaque
                        </span>
                      )}
                      {e.verifiedPartner && (
                        <span className="text-[9px] bg-green-400/15 text-green-500 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                          <BadgeCheck className="h-2.5 w-2.5" /> verificado
                        </span>
                      )}
                      {e.views > 0 && (
                        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                          <TrendingUp className="h-2.5 w-2.5" /> {e.views} views
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-bold text-primary">{e.score}pt</div>
                    <div className="w-10 h-1 rounded-full bg-secondary/50 mt-1 overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (e.score / 10) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleGenerate("agenda")}
          disabled={generating || selectedEvents.length === 0}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-primary/15 px-3 py-2.5 text-[11px] font-semibold text-primary hover:bg-primary/25 transition disabled:opacity-50"
        >
          <CalendarDays className="h-3.5 w-3.5" /> Agenda do Dia
        </button>
        <button
          onClick={() => handleGenerate("top")}
          disabled={generating || selectedEvents.length === 0}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-yellow-400/15 px-3 py-2.5 text-[11px] font-semibold text-yellow-500 hover:bg-yellow-400/25 transition disabled:opacity-50"
        >
          <Trophy className="h-3.5 w-3.5" /> Top Rolês
        </button>
        <button
          onClick={() => handleGenerate("individual")}
          disabled={generating || selectedEvents.length === 0}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-accent/15 px-3 py-2.5 text-[11px] font-semibold text-accent hover:bg-accent/25 transition disabled:opacity-50"
        >
          <Image className="h-3.5 w-3.5" /> Posts Individuais
        </button>
        <button
          onClick={() => handleGenerate("all")}
          disabled={generating || selectedEvents.length === 0}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-2.5 text-[11px] font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Gerar Tudo
        </button>
      </div>

      {/* Outputs */}
      {outputs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Conteúdo Gerado ({outputs.length})
            </h3>
            <button
              onClick={async () => {
                setBulkGeneratingImages(true);
                const canvas = document.createElement("canvas");
                const updated = [...outputs];
                for (let i = 0; i < updated.length; i++) {
                  const o = updated[i];
                  const ev = o.eventId ? events.find(e => e.id === o.eventId) : (o.events?.[0] || null);
                  if (ev) {
                    try {
                      const badge = o.mode === "top" ? "TOP ROLÊS DE HOJE" : o.mode === "agenda" ? "AGENDA DE HOJE" : "HOJE NA ROXOU";
                      const dataUrl = await renderEventCard(canvas, ev, badge);
                      updated[i] = { ...o, generatedImageUrl: dataUrl };
                    } catch { /* skip */ }
                  }
                }
                setOutputs(updated);
                setBulkGeneratingImages(false);
                toast.success("Imagens geradas!");
              }}
              disabled={bulkGeneratingImages}
              className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1.5 text-[10px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
            >
              {bulkGeneratingImages ? <Loader2 className="h-3 w-3 animate-spin" /> : <Image className="h-3 w-3" />}
              Gerar imagens de todos
            </button>
          </div>

          {outputs.map((output, idx) => {
            const isExpanded = expandedOutput === idx;
            const modeIcon = output.mode === "agenda" ? CalendarDays : output.mode === "top" ? Trophy : Image;
            const ModeIcon = modeIcon;
            const modeLabel = output.mode === "agenda" ? "Agenda" : output.mode === "top" ? "Top Rolês" : "Individual";
            const modeCls = output.mode === "agenda" ? "text-primary" : output.mode === "top" ? "text-yellow-500" : "text-accent";
            const eventForImage = output.eventId ? events.find(e => e.id === output.eventId) : (output.events?.[0] || null);

            return (
              <div key={idx} className="rounded-xl border border-border/40 bg-card overflow-hidden">
                <button
                  onClick={() => setExpandedOutput(isExpanded ? null : idx)}
                  className="w-full flex items-center justify-between p-3 hover:bg-secondary/20 transition"
                >
                  <div className="flex items-center gap-2">
                    <ModeIcon className={`h-3.5 w-3.5 ${modeCls}`} />
                    <span className="text-xs font-semibold text-foreground">{output.title}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-secondary/40 text-muted-foreground">{modeLabel}</span>
                    {output.generatedImageUrl && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-green-400/15 text-green-500">📷</span>}
                  </div>
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="p-3 pt-0 space-y-3 border-t border-border/20">
                    {/* Image generation */}
                    <div className="space-y-2">
                      <span className="text-[9px] text-muted-foreground font-medium uppercase">Imagem promocional</span>
                      {eventForImage ? (
                        <EventImageGenerator
                          event={eventForImage}
                          badge={output.mode === "top" ? "TOP ROLÊS DE HOJE" : output.mode === "agenda" ? "AGENDA DE HOJE" : "HOJE NA ROXOU"}
                          initialImage={output.generatedImageUrl}
                          onImageGenerated={(dataUrl) => {
                            const updated = [...outputs];
                            updated[idx] = { ...output, generatedImageUrl: dataUrl };
                            setOutputs(updated);
                          }}
                          onSendToDraft={(imageDataUrl) => {
                            const params = new URLSearchParams();
                            params.set("caption", output.captionFull);
                            params.set("image", imageDataUrl);
                            navigate(`/admin/instagram?tab=publicacao&${params.toString()}`);
                          }}
                        />
                      ) : (
                        <p className="text-[10px] text-muted-foreground">Nenhum evento com imagem disponível.</p>
                      )}
                    </div>

                    {/* Reel generation */}
                    <div className="space-y-2">
                      <span className="text-[9px] text-muted-foreground font-medium uppercase">Reels promocional</span>
                      {eventForImage ? (
                        <ReelGenerator
                          event={eventForImage}
                          badge={output.mode === "top" ? "TOP ROLÊS DE HOJE" : output.mode === "agenda" ? "AGENDA DE HOJE" : "HOJE NA ROXOU"}
                          onSendToDraft={() => {
                            toast.info("Vídeo pronto para publicação manual");
                          }}
                        />
                      ) : (
                        <p className="text-[10px] text-muted-foreground">Nenhum evento com imagem para gerar reel.</p>
                      )}
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground font-medium uppercase">Legenda completa</span>
                      <pre className="whitespace-pre-wrap text-[11px] text-foreground bg-background/50 rounded-lg p-3 font-sans leading-relaxed mt-1 max-h-60 overflow-y-auto border border-border/20">
                        {output.captionFull}
                      </pre>
                      <button
                        onClick={() => copyText(output.captionFull, "Legenda copiada!")}
                        className="flex items-center gap-1 mt-1.5 rounded-md bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/25 transition"
                      >
                        <Copy className="h-3 w-3" /> Copiar legenda
                      </button>
                    </div>

                    {/* Short caption */}
                    <div>
                      <span className="text-[9px] text-muted-foreground font-medium uppercase">Legenda curta</span>
                      <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground bg-background/50 rounded-lg p-2 font-sans leading-relaxed mt-1 border border-border/20">
                        {output.captionShort}
                      </pre>
                      <button
                        onClick={() => copyText(output.captionShort, "Legenda curta copiada!")}
                        className="flex items-center gap-1 mt-1.5 rounded-md bg-secondary/50 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition"
                      >
                        <Copy className="h-3 w-3" /> Copiar curta
                      </button>
                    </div>

                    {/* Image prompt */}
                    <div>
                      <span className="text-[9px] text-muted-foreground font-medium uppercase">Prompt de imagem</span>
                      <pre className="whitespace-pre-wrap text-[10px] text-muted-foreground bg-background/50 rounded-lg p-2 font-sans leading-relaxed mt-1 border border-border/20">
                        {output.imagePrompt}
                      </pre>
                      <button
                        onClick={() => copyText(output.imagePrompt, "Prompt copiado!")}
                        className="flex items-center gap-1 mt-1.5 rounded-md bg-secondary/50 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition"
                      >
                        <Copy className="h-3 w-3" /> Copiar prompt
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap pt-1">
                      <button
                        onClick={() => sendToInstagramDraft(output)}
                        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1.5 text-[10px] font-semibold text-white hover:opacity-90 transition"
                      >
                        <Send className="h-3 w-3" /> Enviar p/ publicação
                      </button>
                      <button
                        onClick={async () => {
                          await supabase.from("content_generations" as any).insert({
                            type: "post",
                            source_type: `agenda_${output.mode}`,
                            source_id: output.eventId || null,
                            title: output.title,
                            generated_text: output.captionFull,
                            image_url: output.generatedImageUrl || null,
                            favorited: true,
                          } as any);
                          toast.success("Salvo como rascunho favorito!");
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-secondary/50 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition"
                      >
                        <FileText className="h-3 w-3" /> Salvar rascunho
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InstagramAgenda;
