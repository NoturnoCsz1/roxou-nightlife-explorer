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
  Eye, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import AdminAIStrategy from "@/components/admin/AdminAIStrategy";

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
  aura_pick: boolean;
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
  const [activeMode, setActiveMode] = useState<OutputMode>("story");

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
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generation
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState<string>("");
  const [outputs, setOutputs] = useState<GeneratedItem[]>([]);
  const [expandedOutput, setExpandedOutput] = useState<number | null>(null);
  const [storyPreview, setStoryPreview] = useState<GeneratedItem | null>(null);
  const outputsRef = useRef<HTMLDivElement | null>(null);

  // Batch
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const batchAbortRef = useRef(false);
  const [zipping, setZipping] = useState(false);
  const [downloadCelebration, setDownloadCelebration] = useState(false);

  // ============ DATA LOADING ============

  useEffect(() => { loadEvents(); }, [dateFilter]);

  async function loadEvents() {
    setLoading(true);
    const { start, end } = getDateRange(dateFilter);

    let query = supabase.from("events")
      .select("id, title, slug, date_time, venue_name, category, sub_category, image_url, featured, partner_id, description, ticket_url, aura_pick")
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
      return { ...e, score, views, saves, verifiedPartner: isVerified, aura_pick: !!e.aura_pick };
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

  async function handleGenerate(type: ContentType | "all", modeOverride: OutputMode = activeMode) {
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
        generated_text: modeOverride === "feed" ? r.feedCopy.full : r.storyCopy.full,
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

  function buildDownloadName(title: string, kind: "FEED" | "STORY" | "REEL" | "LEGENDA", ext: string, idx?: number) {
    const date = format(new Date(), "dd-MM");
    const safeTitle = title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toUpperCase()
      .slice(0, 48) || "EVENTO";
    const prefix = idx ? `${String(idx).padStart(2, "0")}_` : "";
    return `${prefix}ROXOU_${date}_${safeTitle}_${kind}.${ext}`;
  }

  async function downloadZip() {
    if (!hasMedia) { toast.error("Nenhuma mídia gerada"); return; }
    setZipping(true);
    try {
      const zip = new JSZip();
      const dateStr = format(new Date(), "dd-MM");
      let count = 0;

      for (const [idx, o] of outputs.entries()) {
        if (o.feedImageUrl) { zip.file(`feed/${buildDownloadName(o.title, "FEED", "png", idx + 1)}`, await (await fetch(o.feedImageUrl)).blob()); count++; }
        if (o.storyImageUrl) { zip.file(`story/${buildDownloadName(o.title, "STORY", "png", idx + 1)}`, await (await fetch(o.storyImageUrl)).blob()); count++; }
        if (o.reelUrl) { zip.file(`reels/${buildDownloadName(o.title, "REEL", "webm", idx + 1)}`, await (await fetch(o.reelUrl)).blob()); count++; }
        zip.file(`legendas/${buildDownloadName(o.title, "LEGENDA", "txt", idx + 1).replace(".txt", "_FEED.txt")}`, o.feedCopy.full);
        zip.file(`legendas/${buildDownloadName(o.title, "LEGENDA", "txt", idx + 1).replace(".txt", "_STORY.txt")}`, o.storyCopy.full);
        count += 2;
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `ROXOU_${dateStr}_STUDIO.zip`; a.click();
      URL.revokeObjectURL(url);
      setDownloadCelebration(true);
      window.setTimeout(() => setDownloadCelebration(false), 2200);
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
      {downloadCelebration && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/30 backdrop-blur-sm animate-fade-in pointer-events-none">
          <div className="relative rounded-2xl border border-primary/30 bg-background/90 px-8 py-7 text-center shadow-2xl animate-scale-in">
            <div className="absolute -top-3 left-6 text-xl animate-bounce">🎉</div>
            <div className="absolute -top-4 right-8 text-lg animate-bounce">✨</div>
            <div className="absolute -bottom-3 left-10 text-lg animate-bounce">🎊</div>
            <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
            <p className="mt-3 text-sm font-black text-foreground">Download concluído!</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Arquivos ROXOU organizados e prontos.</p>
          </div>
        </div>
      )}
      <Dialog open={!!storyPreview} onOpenChange={(open) => !open && setStoryPreview(null)}>
        <DialogContent className="max-w-[360px] rounded-2xl border-border/40 bg-background/95 p-4 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-sm">Preview do Story</DialogTitle>
          </DialogHeader>
          {storyPreview && (
            <div className="mx-auto aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-[2rem] border-4 border-border bg-card shadow-2xl">
              <div className="relative h-full w-full bg-gradient-to-b from-background via-card to-secondary/60 p-4">
                {(() => {
                  const ev = storyPreview.eventId ? events.find(e => e.id === storyPreview.eventId) : storyPreview.events?.[0];
                  return ev?.image_url ? (
                    <img src={ev.image_url} alt="Preview do flyer" className="absolute inset-0 h-full w-full object-cover opacity-55" />
                  ) : null;
                })()}
                <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/10 to-background/85" />
                <div className="pointer-events-none absolute inset-x-0 top-[7%] border-t border-dashed border-primary/45" />
                <div className="pointer-events-none absolute inset-x-0 top-[15%] border-t border-dashed border-primary/25" />
                <div className="pointer-events-none absolute inset-x-0 bottom-[12%] border-t border-dashed border-primary/45" />
                <div className="pointer-events-none absolute inset-x-0 bottom-[20%] border-t border-dashed border-primary/25" />
                <div className="pointer-events-none absolute left-4 top-[7%] -translate-y-1/2 rounded-full bg-background/75 px-2 py-0.5 text-[8px] font-bold uppercase text-primary">Avatar / topo</div>
                <div className="pointer-events-none absolute bottom-[12%] left-4 translate-y-1/2 rounded-full bg-background/75 px-2 py-0.5 text-[8px] font-bold uppercase text-primary">Barra de mensagem</div>
                <div className="relative flex h-full flex-col justify-end gap-3">
                  <span className="w-fit rounded-full bg-primary/20 px-2.5 py-1 text-[10px] font-black uppercase text-primary">ROXOU STORY</span>
                  <h3 className="text-2xl font-black leading-tight text-foreground">{storyPreview.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground line-clamp-4">{storyPreview.storyCopy.hook || storyPreview.storyCopy.full}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Header */}
      <div>
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Estúdio de Conteúdo
        </h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Stories em primeiro lugar · Feed e Reels no rodapé · {todayStr}
        </p>
      </div>

      {/* Story-first mode */}
      <div className="rounded-2xl border border-border/30 bg-white/5 p-2.5 backdrop-blur-xl">
        <button
          onClick={() => setActiveMode("story")}
          className={`w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
            activeMode === "story"
              ? "bg-primary/20 text-primary shadow-sm shadow-primary/20"
              : "bg-white/5 text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarDays className="h-4 w-4" /> Modo Story 9:16
        </button>
      </div>

      {/* Search + Date filter */}
      <EventSearchFilter searchQuery={searchQuery} onSearchChange={setSearchQuery} dateFilter={dateFilter} onDateFilterChange={setDateFilter} />

      {/* Filters */}
      <div className="rounded-2xl border border-border/40 bg-white/5 p-3 space-y-2">
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
      <div className="rounded-2xl border border-border/40 bg-white/5 p-3 space-y-2">
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
          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {(() => {
              const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
              const isToday = (dt: string) =>
                new Date(dt).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) === todayStr;

              const auraList = filteredEvents.filter(e => e.aura_pick);
              const auraIds = new Set(auraList.map(e => e.id));
              const todayList = filteredEvents.filter(e => !auraIds.has(e.id) && isToday(e.date_time));
              const todayIds = new Set(todayList.map(e => e.id));
              const upcomingList = filteredEvents.filter(e => !auraIds.has(e.id) && !todayIds.has(e.id));

              const renderRow = (e: ScoredEvent) => {
                const isSelected = selected.has(e.id);
                const h = format(new Date(e.date_time), "HH:mm");
                return (
                  <div key={e.id} onClick={() => toggleSelect(e.id)}
                    className={`flex items-start gap-2 rounded-2xl p-2 cursor-pointer transition border ${isSelected ? "border-primary/30 bg-primary/5" : "border-transparent bg-white/5 hover:bg-secondary/30"}`}>
                    {isSelected ? <CheckSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" /> : <Square className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />}
                    {e.image_url && <img src={e.image_url} alt="" className="h-9 w-9 rounded-md object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{e.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">{h}</span>
                        {e.venue_name && <span className="text-[10px] text-muted-foreground">· {e.venue_name}</span>}
                      </div>
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {e.aura_pick && <span className="text-[9px] bg-pink-500/15 text-pink-300 px-1.5 py-0.5 rounded-full font-bold">🤖 Aura</span>}
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
              };

              const renderSection = (
                title: string,
                icon: string,
                accent: string,
                list: ScoredEvent[]
              ) => (
                list.length > 0 && (
                  <div className="space-y-1.5">
                    <div className={`flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider ${accent}`}>
                      <span>{icon}</span>
                      <span>{title}</span>
                      <span className="text-muted-foreground font-medium">({list.length})</span>
                    </div>
                    <div className="space-y-1.5">{list.map(renderRow)}</div>
                  </div>
                )
              );

              return (
                <>
                  {renderSection("Destaques da Aura", "🤖", "text-pink-300", auraList)}
                  {renderSection("Hoje", "🔥", "text-orange-400", todayList)}
                  {renderSection("Próximos", "📅", "text-primary", upcomingList)}
                </>
              );
            })()}
          </div>
        )}
      </div>

      <AdminAIStrategy />

      {/* ═══════════ SEÇÃO 1 · IA MASTER (HERO) ═══════════ */}
      <section className="space-y-2">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-pink-400" /> IA Master
        </h3>
        <div className="relative rounded-2xl border border-pink-500/40 bg-gradient-to-br from-purple-600/20 via-pink-500/15 to-orange-500/10 backdrop-blur-xl p-4 space-y-3 overflow-hidden shadow-[0_0_32px_-8px_hsl(var(--primary)/0.4)]">
          <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-pink-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-purple-500/30 blur-3xl" />

          <div className="relative flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-pink-400" /> Modo IA
            </span>
            <div className="flex gap-1.5">
              <button onClick={() => setViralMode(!viralMode)}
                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-bold transition ${viralMode ? "bg-pink-500/30 text-pink-300 ring-1 ring-pink-500/50" : "bg-white/5 text-muted-foreground hover:text-foreground"}`}>
                ⚡ Viral
              </button>
              <button onClick={() => setEconomyMode(!economyMode)}
                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-bold transition ${economyMode ? "bg-green-500/25 text-green-400 ring-1 ring-green-500/40" : "bg-white/5 text-muted-foreground hover:text-foreground"}`}>
                💰 Econ.
              </button>
            </div>
          </div>

          {filteredEvents.length > 0 && (
            <div className="relative flex flex-wrap gap-1.5 text-[9px]">
              {(() => {
                const ranked = [...filteredEvents].sort((a, b) => b.score - a.score);
                const reelHero = ranked.find(e => e.image_url) || ranked[0];
                const destaqueHero = ranked[0];
                return (
                  <>
                    {reelHero && <span className="bg-white/10 text-pink-300 px-2 py-1 rounded-full">🎬 Reels: <b>{reelHero.title.slice(0, 22)}</b></span>}
                    {destaqueHero && destaqueHero.id !== reelHero?.id && <span className="bg-white/10 text-yellow-300 px-2 py-1 rounded-full">🔥 Destaque: <b>{destaqueHero.title.slice(0, 22)}</b></span>}
                  </>
                );
              })()}
            </div>
          )}

          <button onClick={handleIdealOfDay} disabled={generating || filteredEvents.length === 0}
            className="relative w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 px-4 py-4 text-base font-black text-white hover:opacity-95 transition disabled:opacity-50 shadow-[0_0_24px_hsl(var(--primary)/0.55),0_0_48px_hsl(var(--primary)/0.3)] animate-pulse">
            {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            ✨ CRIAR STORY COM AURA
          </button>
          <p className="relative text-center text-[11px] text-pink-200/80 font-medium">
            Em 1 clique: Story, Destaque e Reels prontos pra postar.
          </p>
        </div>
      </section>

      {/* ═══════════ SEÇÃO 2 · FERRAMENTAS (RÁPIDO + AVANÇADO) ═══════════ */}
      {(() => {
        const tools = [
          { type: "agenda" as const, icon: CalendarDays, label: "Gerar Story Agenda", desc: "Tudo do dia", group: "rapido" as const, tint: "text-primary bg-primary/15 border-primary/35" },
          { type: "top" as const, icon: Trophy, label: "Gerar Story Top Rolês", desc: "Ranking quente", group: "rapido" as const, tint: "text-yellow-500 bg-yellow-400/15 border-yellow-400/35" },
          { type: "destaque" as const, icon: Zap, label: "Gerar Story Destaque", desc: "Hero do dia", group: "avancado" as const, tint: "text-pink-400 bg-white/5 border-pink-500/20" },
          { type: "individual" as const, icon: Image, label: "Gerar Story Individual", desc: "Um por evento", group: "avancado" as const, tint: "text-accent bg-white/5 border-accent/20" },
        ];
        const renderCard = (t: typeof tools[number], primary: boolean) => (
          <div key={t.type} className="relative">
            <button onClick={() => { setActiveMode("story"); handleGenerate(t.type, "story"); }} disabled={generating || selectedEvents.length === 0}
              className={`group flex w-full flex-col items-start gap-2 rounded-2xl border backdrop-blur-md text-left transition hover:scale-[1.02] hover:border-primary/40 disabled:opacity-50 disabled:hover:scale-100 ${primary ? "min-h-[112px] p-4 pr-10 shadow-[0_0_24px_-8px_hsl(var(--primary)/0.55)]" : "min-h-[86px] p-3 pr-9"} ${t.tint}`}>
              <t.icon className={primary ? "h-7 w-7" : "h-5 w-5"} />
              <div>
                <div className={`${primary ? "text-[13px]" : "text-[11px]"} font-bold text-foreground leading-tight`}>{t.label}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5">{t.desc}</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setStoryPreview(generateContent(t.type)[0] || null)}
              disabled={selectedEvents.length === 0}
              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/30 bg-background/60 text-muted-foreground backdrop-blur transition hover:bg-primary/15 hover:text-primary disabled:opacity-40"
              title="Pré-visualizar Story"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>
        );
        const rapido = tools.filter(t => t.group === "rapido");
        const avancado = tools.filter(t => t.group === "avancado");
        return (
          <div className="space-y-4">
            {/* RÁPIDO */}
            <section className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Zap className="h-3 w-3" /> Rápido
                </h3>
                <span className="text-[9px] text-muted-foreground">1 clique · pronto pra postar</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {rapido.map(t => renderCard(t, true))}
              </div>
            </section>

            {/* AVANÇADO */}
            <section className="space-y-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(v => !v)}
                className="w-full flex items-center justify-between px-1 group"
              >
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 group-hover:text-foreground transition">
                  <Sparkles className="h-3 w-3" /> Avançado
                  <span className="text-[9px] font-medium text-muted-foreground/70 normal-case tracking-normal">· Controle fino</span>
                </h3>
                {showAdvanced ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              {showAdvanced && (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    {avancado.map(t => renderCard(t, false))}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {MODE_TABS.filter(t => t.key !== "story").map(t => {
                      const Icon = t.icon;
                      const isActive = activeMode === t.key;
                      return (
                        <button key={t.key} onClick={() => setActiveMode(t.key)}
                          className={`flex items-center justify-center gap-1.5 rounded-2xl border border-border/20 bg-transparent px-2 py-2 text-[10px] font-medium transition ${isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
                          <Icon className="h-3 w-3" /> {t.label}
                        </button>
                      );
                    })}
                    <button onClick={() => handleGenerate("all", activeMode)} disabled={generating || selectedEvents.length === 0}
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-border/20 bg-transparent px-2 py-2 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition disabled:opacity-50">
                      <Sparkles className="h-3 w-3" /> Tudo
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        );
      })()}

      {/* ═══════════ SEÇÃO 3 · GERENCIAMENTO (GHOST) ═══════════ */}
      <section className="space-y-2">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Gerenciamento</h3>
        <div className="grid grid-cols-3 gap-1.5">
          <button onClick={() => navigate("/admin/instagram?tab=publicacao")}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border/30 bg-transparent px-2 py-2 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition">
            <Send className="h-3 w-3" /> Publicação
          </button>
          <button onClick={() => navigate("/admin/parceiros")}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border/30 bg-transparent px-2 py-2 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition">
            Parceiros
          </button>
          <button onClick={() => navigate("/admin/eventos")}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border/30 bg-transparent px-2 py-2 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition">
            Eventos
          </button>
        </div>
      </section>

      {/* Generation status */}
      {generating && genStatus && (
        <div className="flex items-center justify-center gap-2 text-[11px] text-primary font-medium animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin" /> {genStatus}
        </div>
      )}

      {/* Outputs */}
      {outputs.length > 0 && (
        <div ref={outputsRef} className="space-y-3">
          {/* Batch actions */}
          <div className="rounded-2xl border border-border/30 bg-white/5 p-3 space-y-3">
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
