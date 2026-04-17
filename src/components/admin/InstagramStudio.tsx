/**
 * Instagram Studio — Unified content generation tool for ROXOU.
 * 3 output modes: Feed (4:5), Story (9:16), Reels (9:16 animated).
 * Replaces separate Agenda + Capas tabs.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";
import {
  CalendarDays, CheckSquare, Square, CheckCheck, Loader2, Copy,
  Sparkles, Trophy, Image, Star, BadgeCheck, TrendingUp,
  Clock, Filter, Send, Download, Video, Zap, Pause, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import EventSearchFilter, { type DateFilter, getDateRange } from "./EventSearchFilter";
import { renderEventCard } from "./EventImageGenerator";
import EventImageGenerator from "./EventImageGenerator";
import ReelGenerator from "./ReelGenerator";
import { generateReel } from "./ReelGenerator";
import {
  renderCoverAgenda, renderCoverTopRoles,
  renderCoverDestaque, renderFlyer,
  type CoverEvent,
} from "@/lib/coverRenderer";
import { generateStoryCopy, generateFeedCopy } from "@/lib/marketingCopy";

// ============ TYPES ============

type OutputMode = "feed" | "story" | "reels";
type ContentType = "agenda" | "top" | "individual" | "destaque";

interface ScoredEvent extends CoverEvent {
  id: string;
  slug: string;
  featured: boolean;
  partner_id: string | null;
  score: number;
  views: number;
  saves: number;
  verifiedPartner: boolean;
}

interface GeneratedItem {
  contentType: ContentType;
  eventId?: string;
  title: string;
  feedCopy: { full: string; short: string };
  storyCopy: { hook: string; body: string; cta: string; full: string };
  feedImageUrl?: string;
  storyImageUrl?: string;
  reelUrl?: string;
  events?: ScoredEvent[];
}

interface BatchJob {
  id: string;
  outputIdx: number;
  kind: "feed" | "story" | "reel";
  label: string;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
}

// Category emoji moved to marketingCopy.ts

const MAX_CONCURRENCY = 2;

const MODE_TABS: { key: OutputMode; label: string; icon: typeof Image; desc: string }[] = [
  { key: "feed", label: "FEED", icon: Image, desc: "1080×1350 · 4:5" },
  { key: "story", label: "STORY", icon: CalendarDays, desc: "1080×1920 · 9:16" },
  { key: "reels", label: "REELS", icon: Video, desc: "1080×1920 · Animado" },
];

// ============ COMPONENT ============

const InstagramStudio = () => {
  const navigate = useNavigate();

  // Mode
  const [activeMode, setActiveMode] = useState<OutputMode>("feed");

  // Data
  const [events, setEvents] = useState<ScoredEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("hoje");
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sortBy, setSortBy] = useState<"score" | "time" | "views">("score");

  // Marketing modes
  const [viralMode, setViralMode] = useState(false);
  const [economyMode, setEconomyMode] = useState(false);

  // Generation
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState<string>("");
  const [outputs, setOutputs] = useState<GeneratedItem[]>([]);
  const [expandedOutput, setExpandedOutput] = useState<number | null>(null);
  const outputsRef = useRef<HTMLDivElement | null>(null);

  // Batch
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const batchAbortRef = useRef(false);
  const [zipping, setZipping] = useState(false);

  // ============ DATA LOADING ============

  useEffect(() => { loadEvents(); }, [dateFilter]);

  async function loadEvents() {
    setLoading(true);
    const { start, end } = getDateRange(dateFilter);

    let query = supabase.from("events")
      .select("id, title, slug, date_time, venue_name, category, sub_category, image_url, featured, partner_id, description, ticket_url")
      .eq("status", "published")
      .gte("date_time", start.toISOString())
      .order("date_time");

    if (end) query = query.lt("date_time", end.toISOString());

    const [eventsRes, viewsRes, savesRes, partnersRes] = await Promise.all([
      query,
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

    const scored: ScoredEvent[] = rawEvents.map((e: any) => {
      const views = viewMap[e.id] || 0;
      const saves = saveMap[e.id] || 0;
      const isVerified = e.partner_id ? verifiedMap.has(e.partner_id) : false;
      const hour = new Date(e.date_time).getHours();
      const isPrimeTime = hour >= 20 || hour <= 4;
      let score = 0;
      if (e.featured) score += 4;
      if (isVerified) score += 3;
      if (views >= 5) score += 2;
      if (isPrimeTime) score += 1;
      if (e.image_url) score += 1;
      return { ...e, score, views, saves, verifiedPartner: isVerified };
    });

    setEvents(scored);
    setSelected(new Set(scored.map(e => e.id)));
    setLoading(false);
  }

  // ============ FILTERING ============

  const filteredEvents = useMemo(() => {
    let list = [...events];
    if (onlyFeatured) list = list.filter(e => e.featured);
    if (onlyVerified) list = list.filter(e => e.verifiedPartner);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) ||
        (e.venue_name && e.venue_name.toLowerCase().includes(q)) ||
        e.category.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "views") return b.views - a.views;
      return new Date(a.date_time).getTime() - new Date(b.date_time).getTime();
    });
    return list;
  }, [events, onlyFeatured, onlyVerified, sortBy, searchQuery]);

  const selectedEvents = useMemo(() =>
    filteredEvents.filter(e => selected.has(e.id)).sort((a, b) => b.score - a.score),
    [filteredEvents, selected]
  );

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const toggleAll = () => {
    setSelected(selected.size === filteredEvents.length ? new Set() : new Set(filteredEvents.map(e => e.id)));
  };

  // ============ CONTENT GENERATION ============

  function generateContent(type: ContentType): GeneratedItem[] {
    if (type === "individual") {
      const list = economyMode ? selectedEvents.slice(0, 1) : selectedEvents;
      return list.map(ev => ({
        contentType: "individual" as const,
        eventId: ev.id,
        title: ev.title,
        feedCopy: generateFeedCopy([ev], "individual"),
        storyCopy: generateStoryCopy([ev], "individual", viralMode),
      }));
    }
    if (type === "destaque") {
      const hero = selectedEvents[0];
      if (!hero) return [];
      return [{
        contentType: "destaque" as const,
        eventId: hero.id,
        title: `🔥 ${hero.title}`,
        feedCopy: generateFeedCopy([hero], "individual"),
        storyCopy: generateStoryCopy([hero], "destaque", viralMode),
      }];
    }
    // agenda or top
    return [{
      contentType: type,
      title: type === "top" ? "🏆 Top Rolês" : "📅 Agenda do Dia",
      feedCopy: generateFeedCopy(selectedEvents, type),
      storyCopy: generateStoryCopy(selectedEvents, type, viralMode),
      events: selectedEvents.slice(0, 10),
    }];
  }

  async function handleGenerate(type: ContentType | "all") {
    if (selectedEvents.length === 0) { toast.error("Selecione pelo menos um evento"); return; }
    setGenerating(true);
    setGenStatus("Gerando conteúdo...");
    setOutputs([]);
    setBatchJobs([]);

    let results: GeneratedItem[] = [];
    if (type === "all") {
      results = [
        ...generateContent("agenda"),
        ...generateContent("top"),
        ...generateContent("individual"),
      ];
    } else {
      results = generateContent(type);
    }

    setGenStatus("Otimizando copy...");

    // Save to history
    for (const r of results) {
      await supabase.from("content_generations" as any).insert({
        type: "post",
        source_type: `studio_${r.contentType}`,
        source_id: r.eventId || null,
        title: r.title,
        generated_text: activeMode === "feed" ? r.feedCopy.full : r.storyCopy.full,
      } as any);
    }

    setOutputs(results);
    setExpandedOutput(0);
    setGenerating(false);
    setGenStatus("");
    toast.success(`${results.length} conteúdo(s) gerado(s)!`);
    // Auto-scroll
    setTimeout(() => outputsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  // ============ IDEAL OF DAY ============
  // Auto-pick top events, generate agenda + top + destaque in one click

  async function handleIdealOfDay() {
    if (filteredEvents.length === 0) { toast.error("Sem eventos para gerar ideal"); return; }
    // Auto-select top 10 by score for the day
    const ranked = [...filteredEvents].sort((a, b) => b.score - a.score);
    setSelected(new Set(ranked.slice(0, 10).map(e => e.id)));
    // Wait one tick for state to settle
    await new Promise(r => setTimeout(r, 50));
    setGenerating(true);
    setGenStatus("Selecionando os melhores...");
    setOutputs([]);
    setBatchJobs([]);

    const top10 = ranked.slice(0, 10);
    const top3 = ranked.slice(0, 3);
    const hero = ranked[0];

    setGenStatus("Otimizando copy ideal...");

    const results: GeneratedItem[] = [];
    // Destaque (hero) — Reel + Story
    if (hero) {
      results.push({
        contentType: "destaque",
        eventId: hero.id,
        title: `🔥 ${hero.title}`,
        feedCopy: generateFeedCopy([hero], "individual"),
        storyCopy: generateStoryCopy([hero], "destaque", viralMode),
      });
    }
    // Top 3 → Story
    if (top3.length > 0) {
      results.push({
        contentType: "top",
        title: "🏆 Top Rolês",
        feedCopy: generateFeedCopy(top3, "top"),
        storyCopy: generateStoryCopy(top3, "top", viralMode),
        events: top3,
      });
    }
    // Agenda Top 10 → Feed
    results.push({
      contentType: "agenda",
      title: "📅 Agenda do Dia",
      feedCopy: generateFeedCopy(top10, "agenda"),
      storyCopy: generateStoryCopy(top10, "agenda", viralMode),
      events: top10,
    });

    for (const r of results) {
      await supabase.from("content_generations" as any).insert({
        type: "post",
        source_type: `studio_ideal_${r.contentType}`,
        source_id: r.eventId || null,
        title: r.title,
        generated_text: r.storyCopy.full,
      } as any);
    }

    setOutputs(results);
    setExpandedOutput(0);
    setGenerating(false);
    setGenStatus("");
    toast.success(`✨ Ideal do dia: ${results.length} conteúdos prontos!`);
    setTimeout(() => outputsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  // ============ BATCH GENERATION ============

  const runBatch = useCallback(async (jobs: BatchJob[], currentOutputs: GeneratedItem[]) => {
    setBatchRunning(true);
    batchAbortRef.current = false;
    const updatedOutputs = [...currentOutputs];
    const updatedJobs = [...jobs];

    let nextIdx = 0;
    const processing = new Set<number>();

    async function processJob(jobIdx: number) {
      const job = updatedJobs[jobIdx];
      if (!job || job.status !== "pending") return;
      job.status = "processing";
      setBatchJobs([...updatedJobs]);

      const output = updatedOutputs[job.outputIdx];
      const ev = output.eventId ? events.find(e => e.id === output.eventId) : (output.events?.[0] || null);

      if (!ev) { job.status = "error"; job.error = "Evento não encontrado"; setBatchJobs([...updatedJobs]); return; }

      const badge = output.contentType === "top" ? "TOP ROLÊS DE HOJE" : output.contentType === "agenda" ? "AGENDA DE HOJE" : "HOJE NA ROXOU";

      try {
        if (job.kind === "feed") {
          const canvas = document.createElement("canvas");
          if (output.contentType === "agenda") {
            const url = await renderCoverAgenda(canvas, output.events || [ev], "feed");
            updatedOutputs[job.outputIdx] = { ...updatedOutputs[job.outputIdx], feedImageUrl: url };
          } else if (output.contentType === "top") {
            const url = await renderCoverTopRoles(canvas, (output.events || [ev]).slice(0, 5), "feed");
            updatedOutputs[job.outputIdx] = { ...updatedOutputs[job.outputIdx], feedImageUrl: url };
          } else if (output.contentType === "destaque") {
            const url = await renderCoverDestaque(canvas, ev, "feed");
            updatedOutputs[job.outputIdx] = { ...updatedOutputs[job.outputIdx], feedImageUrl: url };
          } else {
            const url = await renderEventCard(canvas, ev, badge, "feed");
            updatedOutputs[job.outputIdx] = { ...updatedOutputs[job.outputIdx], feedImageUrl: url };
          }
          setOutputs([...updatedOutputs]);
        } else if (job.kind === "story") {
          const canvas = document.createElement("canvas");
          if (output.contentType === "agenda") {
            const url = await renderCoverAgenda(canvas, output.events || [ev], "story");
            updatedOutputs[job.outputIdx] = { ...updatedOutputs[job.outputIdx], storyImageUrl: url };
          } else if (output.contentType === "top") {
            const url = await renderCoverTopRoles(canvas, (output.events || [ev]).slice(0, 5), "story");
            updatedOutputs[job.outputIdx] = { ...updatedOutputs[job.outputIdx], storyImageUrl: url };
          } else if (output.contentType === "destaque") {
            const url = await renderCoverDestaque(canvas, ev, "story");
            updatedOutputs[job.outputIdx] = { ...updatedOutputs[job.outputIdx], storyImageUrl: url };
          } else {
            const url = await renderFlyer(canvas, ev, badge, "story");
            updatedOutputs[job.outputIdx] = { ...updatedOutputs[job.outputIdx], storyImageUrl: url };
          }
          setOutputs([...updatedOutputs]);
        } else if (job.kind === "reel") {
          const canvas = document.createElement("canvas");
          const secondary = events.filter(e => e.id !== ev.id && e.image_url).slice(0, 2).map(e => ({
            title: e.title, date_time: e.date_time, venue_name: e.venue_name,
            category: e.category, image_url: e.image_url, description: e.description,
            sub_category: e.sub_category, ticket_url: e.ticket_url,
          }));
          const blob = await generateReel(canvas, ev, badge, secondary);
          const url = URL.createObjectURL(blob);
          updatedOutputs[job.outputIdx] = { ...updatedOutputs[job.outputIdx], reelUrl: url };
          setOutputs([...updatedOutputs]);
        }
        job.status = "done";
      } catch (err: any) { job.status = "error"; job.error = err.message; }
      setBatchJobs([...updatedJobs]);
    }

    while (nextIdx < updatedJobs.length && !batchAbortRef.current) {
      while (processing.size < MAX_CONCURRENCY && nextIdx < updatedJobs.length) {
        if (batchAbortRef.current) break;
        const idx = nextIdx++;
        processing.add(idx);
        processJob(idx).then(() => processing.delete(idx));
      }
      await new Promise(r => setTimeout(r, 200));
    }
    while (processing.size > 0) await new Promise(r => setTimeout(r, 200));

    setBatchRunning(false);
    if (!batchAbortRef.current) toast.success("Geração completa!");
  }, [events]);

  function startBatch(kind: "feed" | "story" | "reel" | "all") {
    const kinds: ("feed" | "story" | "reel")[] = kind === "all" ? ["feed", "story", "reel"] : [kind];
    const jobs: BatchJob[] = [];
    for (const k of kinds) {
      outputs.forEach((o, idx) => {
        if (k === "reel") {
          const ev = o.eventId ? events.find(e => e.id === o.eventId) : (o.events?.[0] || null);
          if (!ev?.image_url) return;
        }
        jobs.push({ id: `${k}-${idx}`, outputIdx: idx, kind: k, label: `${k === "feed" ? "📷" : k === "story" ? "📱" : "🎬"} ${o.title}`, status: "pending" });
      });
    }
    setBatchJobs(jobs);
    runBatch(jobs, outputs);
  }

  // ============ ZIP ============

  const hasMedia = useMemo(() =>
    outputs.some(o => o.feedImageUrl || o.storyImageUrl || o.reelUrl), [outputs]
  );

  async function downloadZip() {
    if (!hasMedia) { toast.error("Nenhuma mídia gerada"); return; }
    setZipping(true);
    try {
      const zip = new JSZip();
      const dateStr = format(new Date(), "yyyy-MM-dd");
      let count = 0;

      for (const [idx, o] of outputs.entries()) {
        const name = o.title.slice(0, 30).replace(/[^a-zA-Z0-9À-ú ]/g, "").replace(/\s+/g, "_");
        if (o.feedImageUrl) { zip.file(`feed/${idx + 1}_${name}.jpg`, await (await fetch(o.feedImageUrl)).blob()); count++; }
        if (o.storyImageUrl) { zip.file(`story/${idx + 1}_${name}.jpg`, await (await fetch(o.storyImageUrl)).blob()); count++; }
        if (o.reelUrl) { zip.file(`reels/${idx + 1}_${name}.webm`, await (await fetch(o.reelUrl)).blob()); count++; }
        zip.file(`legendas/${idx + 1}_${name}_feed.txt`, o.feedCopy.full);
        zip.file(`legendas/${idx + 1}_${name}_story.txt`, o.storyCopy.full);
        count += 2;
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `roxou-studio-${dateStr}.zip`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`ZIP com ${count} arquivo(s)!`);
    } catch (err: any) { toast.error("Erro ao gerar ZIP", { description: err.message }); }
    finally { setZipping(false); }
  }

  // ============ HELPERS ============

  const batchStats = useMemo(() => {
    const total = batchJobs.length;
    const done = batchJobs.filter(j => j.status === "done").length;
    const errors = batchJobs.filter(j => j.status === "error").length;
    const pct = total > 0 ? Math.round(((done + errors) / total) * 100) : 0;
    return { total, done, errors, pct };
  }, [batchJobs]);

  function copyText(text: string, label = "Copiado!") {
    navigator.clipboard.writeText(text);
    toast.success(label);
  }

  function sendToDraft(output: GeneratedItem) {
    const params = new URLSearchParams();
    const copy = activeMode === "feed" ? output.feedCopy.full : output.storyCopy.full;
    params.set("caption", copy);
    const ev = output.eventId ? events.find(e => e.id === output.eventId) : null;
    if (ev?.image_url) params.set("image", ev.image_url);
    navigate(`/admin/instagram?tab=publicacao&${params.toString()}`);
  }

  // ============ RENDER ============

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const todayStr = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Estúdio de Conteúdo
        </h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Gere artes e copies para Feed, Story e Reels · {todayStr}
        </p>
      </div>

      {/* Mode tabs */}
      <div className="grid grid-cols-3 gap-1.5">
        {MODE_TABS.map(t => {
          const Icon = t.icon;
          const isActive = activeMode === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveMode(t.key)}
              className={`flex flex-col items-center gap-1 rounded-xl p-3 transition border ${
                isActive
                  ? "border-primary/40 bg-primary/10 shadow-sm shadow-primary/10"
                  : "border-border/30 bg-card/50 hover:bg-secondary/30"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[11px] font-bold ${isActive ? "text-primary" : "text-muted-foreground"}`}>{t.label}</span>
              <span className="text-[8px] text-muted-foreground/60">{t.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Search + Date filter */}
      <EventSearchFilter searchQuery={searchQuery} onSearchChange={setSearchQuery} dateFilter={dateFilter} onDateFilterChange={setDateFilter} />

      {/* Filters */}
      <div className="rounded-xl border border-border/40 bg-card p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
          <Filter className="h-3 w-3" /> Filtros
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setOnlyFeatured(!onlyFeatured)}
            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium transition ${onlyFeatured ? "bg-yellow-400/20 text-yellow-500" : "bg-secondary/40 text-muted-foreground hover:text-foreground"}`}>
            <Star className="h-3 w-3" /> Destaques
          </button>
          <button onClick={() => setOnlyVerified(!onlyVerified)}
            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium transition ${onlyVerified ? "bg-green-400/20 text-green-500" : "bg-secondary/40 text-muted-foreground hover:text-foreground"}`}>
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
            <button key={o.v} onClick={() => setSortBy(o.v)}
              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium transition ${sortBy === o.v ? "bg-primary/20 text-primary" : "bg-secondary/30 text-muted-foreground hover:text-foreground"}`}>
              <o.icon className="h-3 w-3" /> {o.l}
            </button>
          ))}
        </div>
      </div>

      {/* Event Selection */}
      <div className="rounded-xl border border-border/40 bg-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
            Eventos ({filteredEvents.length})
          </span>
          <button onClick={toggleAll} className="flex items-center gap-1 text-[10px] text-primary font-semibold">
            <CheckCheck className="h-3 w-3" />
            {selected.size === filteredEvents.length ? "Desmarcar" : "Selecionar tudo"}
          </button>
        </div>

        {filteredEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhum evento encontrado.</p>
        ) : (
          <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
            {filteredEvents.map(e => {
              const isSelected = selected.has(e.id);
              const h = format(new Date(e.date_time), "HH:mm");
              return (
                <div key={e.id} onClick={() => toggleSelect(e.id)}
                  className={`flex items-start gap-2 rounded-lg p-2 cursor-pointer transition border ${isSelected ? "border-primary/30 bg-primary/5" : "border-transparent bg-card/50 hover:bg-secondary/30"}`}>
                  {isSelected ? <CheckSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" /> : <Square className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />}
                  {e.image_url && <img src={e.image_url} alt="" className="h-9 w-9 rounded-md object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{e.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">{h}</span>
                      {e.venue_name && <span className="text-[10px] text-muted-foreground">· {e.venue_name}</span>}
                    </div>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {e.featured && <span className="text-[9px] bg-yellow-400/15 text-yellow-500 px-1.5 py-0.5 rounded-full font-medium"><Star className="h-2.5 w-2.5 inline" /></span>}
                      {e.verifiedPartner && <span className="text-[9px] bg-green-400/15 text-green-500 px-1.5 py-0.5 rounded-full font-medium"><BadgeCheck className="h-2.5 w-2.5 inline" /></span>}
                      {e.views > 0 && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">{e.views}v</span>}
                      {e.score >= 6 && <span className="text-[9px] bg-pink-500/15 text-pink-400 px-1.5 py-0.5 rounded-full font-bold">🔥 Alto</span>}
                      {e.score >= 4 && e.score < 6 && <span className="text-[9px] bg-orange-400/15 text-orange-400 px-1.5 py-0.5 rounded-full font-bold">⚡ Médio</span>}
                      {e.score < 4 && <span className="text-[9px] bg-muted/30 text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">⚠️ Baixo</span>}
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-primary shrink-0">{e.score}pt</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => handleGenerate("agenda")} disabled={generating || selectedEvents.length === 0}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-primary/15 px-3 py-2.5 text-[11px] font-semibold text-primary hover:bg-primary/25 transition disabled:opacity-50">
          <CalendarDays className="h-3.5 w-3.5" /> Agenda
        </button>
        <button onClick={() => handleGenerate("top")} disabled={generating || selectedEvents.length === 0}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-yellow-400/15 px-3 py-2.5 text-[11px] font-semibold text-yellow-500 hover:bg-yellow-400/25 transition disabled:opacity-50">
          <Trophy className="h-3.5 w-3.5" /> Top Rolês
        </button>
        <button onClick={() => handleGenerate("destaque")} disabled={generating || selectedEvents.length === 0}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-pink-500/15 px-3 py-2.5 text-[11px] font-semibold text-pink-400 hover:bg-pink-500/25 transition disabled:opacity-50">
          <Zap className="h-3.5 w-3.5" /> Destaque
        </button>
        <button onClick={() => handleGenerate("individual")} disabled={generating || selectedEvents.length === 0}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-accent/15 px-3 py-2.5 text-[11px] font-semibold text-accent hover:bg-accent/25 transition disabled:opacity-50">
          <Image className="h-3.5 w-3.5" /> Individuais
        </button>
      </div>
      <button onClick={() => handleGenerate("all")} disabled={generating || selectedEvents.length === 0}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50">
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Gerar Tudo
      </button>

      {/* Outputs */}
      {outputs.length > 0 && (
        <div className="space-y-3">
          {/* Batch actions */}
          <div className="rounded-xl border border-border/30 bg-card p-3 space-y-3">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Conteúdo ({outputs.length}) · {activeMode.toUpperCase()}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {activeMode === "feed" && (
                <button onClick={() => startBatch("feed")} disabled={batchRunning}
                  className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-2 text-[10px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">
                  <Image className="h-3 w-3" /> Gerar imagens Feed
                </button>
              )}
              {activeMode === "story" && (
                <button onClick={() => startBatch("story")} disabled={batchRunning}
                  className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-2 text-[10px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">
                  <CalendarDays className="h-3 w-3" /> Gerar imagens Story
                </button>
              )}
              {activeMode === "reels" && (
                <button onClick={() => startBatch("reel")} disabled={batchRunning}
                  className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-2 text-[10px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">
                  <Video className="h-3 w-3" /> Gerar Reels
                </button>
              )}
              <button onClick={() => startBatch("all")} disabled={batchRunning}
                className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-pink-600 to-orange-500 px-3 py-2 text-[10px] font-bold text-white hover:opacity-90 disabled:opacity-50 transition">
                <Zap className="h-3 w-3" /> Gerar tudo
              </button>
              {batchRunning && (
                <button onClick={() => { batchAbortRef.current = true; toast.info("Interrompido"); }}
                  className="flex items-center gap-1 rounded-lg bg-destructive/15 px-3 py-2 text-[10px] font-semibold text-destructive hover:bg-destructive/25 transition">
                  <Pause className="h-3 w-3" /> Parar
                </button>
              )}
              {hasMedia && !batchRunning && (
                <button onClick={downloadZip} disabled={zipping}
                  className="flex items-center gap-1 rounded-lg bg-secondary/60 px-3 py-2 text-[10px] font-semibold text-foreground hover:bg-secondary transition disabled:opacity-50">
                  {zipping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                  {zipping ? "ZIP…" : "📦 Baixar tudo"}
                </button>
              )}
            </div>

            {/* Progress */}
            {batchJobs.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">
                    {batchRunning ? <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> {batchStats.done}/{batchStats.total}</span> : `Concluído: ${batchStats.done}/${batchStats.total}`}
                  </span>
                  <span className="font-bold text-primary">{batchStats.pct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary/30 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300" style={{ width: `${batchStats.pct}%` }} />
                </div>
                <div className="max-h-28 overflow-y-auto space-y-0.5">
                  {batchJobs.map(job => (
                    <div key={job.id} className="flex items-center gap-2 text-[9px] py-0.5">
                      {job.status === "pending" && <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />}
                      {job.status === "processing" && <Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />}
                      {job.status === "done" && <div className="h-2 w-2 rounded-full bg-green-500" />}
                      {job.status === "error" && <div className="h-2 w-2 rounded-full bg-destructive" />}
                      <span className="text-muted-foreground truncate flex-1">{job.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Output cards */}
          {outputs.map((output, idx) => {
            const isExpanded = expandedOutput === idx;
            const typeIcon = output.contentType === "agenda" ? CalendarDays : output.contentType === "top" ? Trophy : output.contentType === "destaque" ? Zap : Image;
            const TypeIcon = typeIcon;
            const ev = output.eventId ? events.find(e => e.id === output.eventId) : (output.events?.[0] || null);

            return (
              <div key={idx} className="rounded-xl border border-border/30 bg-card overflow-hidden">
                <button onClick={() => setExpandedOutput(isExpanded ? null : idx)}
                  className="w-full flex items-center justify-between px-3.5 py-3 hover:bg-secondary/10 transition">
                  <div className="flex items-center gap-2.5">
                    <TypeIcon className="h-4 w-4 text-primary" />
                    <div className="text-left">
                      <span className="text-xs font-semibold text-foreground block leading-tight truncate max-w-[200px]">{output.title}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {output.feedImageUrl ? "📷" : ""}{output.storyImageUrl ? " 📱" : ""}{output.reelUrl ? " 🎬" : ""}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="px-3.5 pb-4 space-y-4 border-t border-border/15">
                    {/* Actions */}
                    <div className="flex gap-2 pt-3 flex-wrap">
                      <button onClick={() => sendToDraft(output)}
                        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-[11px] font-bold text-white hover:opacity-90 transition">
                        <Send className="h-3.5 w-3.5" /> Publicar
                      </button>
                    </div>

                    {/* Media previews */}
                    <div className="grid grid-cols-1 gap-3">
                      {/* Feed image */}
                      {(activeMode === "feed" || output.feedImageUrl) && (
                        <div className="rounded-lg border border-border/20 bg-background/30 p-3 space-y-2">
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">📷 Feed (1080×1350)</span>
                          {output.feedImageUrl ? (
                            <div className="rounded-lg overflow-hidden border border-border/30 max-w-[200px]">
                              <img src={output.feedImageUrl} alt="Feed" className="w-full" />
                            </div>
                          ) : ev ? (
                            <EventImageGenerator
                              event={ev}
                              badge={output.contentType === "top" ? "TOP ROLÊS" : output.contentType === "agenda" ? "AGENDA" : "ROXOU"}
                              onImageGenerated={(url) => {
                                const u = [...outputs]; u[idx] = { ...output, feedImageUrl: url }; setOutputs(u);
                              }}
                            />
                          ) : <p className="text-[10px] text-muted-foreground/60">Sem imagem</p>}
                        </div>
                      )}

                      {/* Story image */}
                      {(activeMode === "story" || output.storyImageUrl) && (
                        <div className="rounded-lg border border-border/20 bg-background/30 p-3 space-y-2">
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">📱 Story (1080×1920)</span>
                          {output.storyImageUrl ? (
                            <div className="rounded-lg overflow-hidden border border-border/30 max-w-[160px]">
                              <img src={output.storyImageUrl} alt="Story" className="w-full" />
                            </div>
                          ) : <p className="text-[10px] text-muted-foreground/60">Gere via batch acima</p>}
                        </div>
                      )}

                      {/* Reel */}
                      {(activeMode === "reels" || output.reelUrl) && (
                        <div className="rounded-lg border border-border/20 bg-background/30 p-3 space-y-2">
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">🎬 Reels</span>
                          {output.reelUrl ? (
                            <div className="rounded-lg overflow-hidden border border-border/30 max-w-[160px]">
                              <video src={output.reelUrl} controls autoPlay muted loop playsInline className="w-full" style={{ aspectRatio: "9/16" }} />
                            </div>
                          ) : ev ? (
                            <ReelGenerator
                              event={ev}
                              badge={output.contentType === "top" ? "TOP ROLÊS" : "ROXOU"}
                              secondaryEvents={events.filter(e => e.id !== ev.id && e.image_url).slice(0, 2)}
                            />
                          ) : <p className="text-[10px] text-muted-foreground/60">Sem imagem para reel</p>}
                        </div>
                      )}
                    </div>

                    {/* Captions — show based on active mode */}
                    <div className="space-y-2">
                      {activeMode === "feed" ? (
                        <>
                          <CopyBlock label="Legenda Feed" text={output.feedCopy.full} onCopy={copyText} />
                          <CopyBlock label="Legenda Curta" text={output.feedCopy.short} onCopy={copyText} small />
                        </>
                      ) : (
                        <>
                          <CopyBlock label="Copy Story/Reels" text={output.storyCopy.full} onCopy={copyText} highlight />
                          <CopyBlock label="Legenda Feed (alt)" text={output.feedCopy.short} onCopy={copyText} small />
                        </>
                      )}
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

// ============ SMALL COMPONENTS ============

function CopyBlock({ label, text, onCopy, small, highlight }: { label: string; text: string; onCopy: (t: string, l?: string) => void; small?: boolean; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-primary/20 bg-primary/5" : "border-border/20 bg-background/30"}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</span>
        <button onClick={() => onCopy(text, "Copiado!")}
          className="flex items-center gap-1 text-[9px] font-medium text-primary hover:text-primary/80 transition">
          <Copy className="h-2.5 w-2.5" /> Copiar
        </button>
      </div>
      <pre className={`whitespace-pre-wrap font-sans leading-relaxed overflow-y-auto ${small ? "text-[10px] text-muted-foreground max-h-20" : "text-[11px] text-foreground/90 max-h-40"}`}>
        {text}
      </pre>
    </div>
  );
}

export default InstagramStudio;
