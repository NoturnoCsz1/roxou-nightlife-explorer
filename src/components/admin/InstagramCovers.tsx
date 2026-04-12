import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabaseFetchAll";
import JSZip from "jszip";
import {
  CalendarDays, Loader2, Copy, Sparkles, Trophy,
  Star, Download, Video, Zap, Pause, Send,
  ChevronDown, ChevronUp, Users, Layers, Package
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { renderEventCard } from "./EventImageGenerator";
import { generateReel } from "./ReelGenerator";
import {
  renderCoverAgenda,
  renderCoverTopRoles,
  renderCoverWeekend,
  renderCoverPartners,
  renderBannerFestival,
  renderFlyer,
  renderCTASlide,
  type CoverEvent,
  type CoverPartner,
} from "@/lib/coverRenderer";

// ============ TYPES ============

type CoverType = "agenda" | "top" | "weekend" | "partners";

interface ScoredEvent extends CoverEvent {
  id: string;
  slug: string;
  featured: boolean;
  partner_id: string | null;
  description: string | null;
  ticket_url?: string | null;
  sub_category: string | null;
  score: number;
  views: number;
}

interface GeneratedCover {
  type: CoverType;
  label: string;
  formats: Record<string, string | null>; // feed, story, flyer, banner data URLs
  carouselSlides: string[];
  flyerImages: string[]; // individual flyers per event
  captionFull: string;
  captionShort: string;
  reelUrl?: string;
  generating: boolean;
}

interface BatchJob {
  id: string;
  kind: "cover" | "carousel" | "reel" | "flyers" | "banner";
  coverType: CoverType;
  label: string;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
}

const MAX_CONCURRENCY = 2;

const COVER_OPTIONS: { key: CoverType; label: string; icon: typeof CalendarDays; cls: string }[] = [
  { key: "agenda", label: "Agenda do Dia", icon: CalendarDays, cls: "text-primary" },
  { key: "top", label: "Melhores Rolês", icon: Trophy, cls: "text-yellow-500" },
  { key: "weekend", label: "Fim de Semana", icon: Star, cls: "text-purple-400" },
  { key: "partners", label: "Parceiros em Alta", icon: Users, cls: "text-green-400" },
];

const CATEGORY_EMOJI: Record<string, string> = {
  bar: "🍺", balada: "🪩", festa: "🎉", evento: "📌",
  restaurante: "🍽️", "casa de show": "🎤", futebol: "⚽",
  show: "🎤", festival: "🏟️",
};

// ============ COMPONENT ============

const InstagramCovers = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ScoredEvent[]>([]);
  const [weekendEvents, setWeekendEvents] = useState<ScoredEvent[]>([]);
  const [partners, setPartners] = useState<CoverPartner[]>([]);

  const [selectedTypes, setSelectedTypes] = useState<Set<CoverType>>(new Set(["agenda"]));
  const [covers, setCovers] = useState<GeneratedCover[]>([]);
  const [expandedCover, setExpandedCover] = useState<number | null>(null);

  // Batch
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const batchAbortRef = useRef(false);
  const [zipping, setZipping] = useState(false);

  // ============ DATA LOADING ============

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    // Weekend range (next fri-sun)
    const dayOfWeek = now.getDay();
    const daysToFri = dayOfWeek <= 5 ? 5 - dayOfWeek : 6; // days until friday
    const fri = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToFri);
    const mon = new Date(fri.getFullYear(), fri.getMonth(), fri.getDate() + 3);
    const weekendStart = fri.toISOString();
    const weekendEnd = mon.toISOString();

    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

    const [todayRes, weekendRes, partnersRes, viewsRes] = await Promise.all([
      supabase.from("events")
        .select("id, title, slug, date_time, venue_name, category, sub_category, image_url, featured, partner_id, description, ticket_url")
        .eq("status", "published")
        .gte("date_time", todayStart)
        .lt("date_time", todayEnd)
        .order("date_time"),
      supabase.from("events")
        .select("id, title, slug, date_time, venue_name, category, sub_category, image_url, featured, partner_id, description, ticket_url")
        .eq("status", "published")
        .gte("date_time", weekendStart)
        .lt("date_time", weekendEnd)
        .order("date_time"),
      supabase.from("partners").select("id, name, slug, logo_url, active").eq("active", true),
      fetchAllRows<{ page_path: string; partner_id: string | null }>(() =>
        supabase.from("page_views").select("page_path, partner_id").gte("created_at", weekAgo)
      ),
    ]);

    // Score events by views
    const viewMap: Record<string, number> = {};
    const partnerViewMap: Record<string, number> = {};
    (viewsRes || []).forEach((v) => {
      const evMatch = v.page_path.match(/^\/evento\/(.+)$/);
      if (evMatch) viewMap[evMatch[1]] = (viewMap[evMatch[1]] || 0) + 1;
      if (v.partner_id) partnerViewMap[v.partner_id] = (partnerViewMap[v.partner_id] || 0) + 1;
      const locMatch = v.page_path.match(/^\/local\/(.+)$/);
      if (locMatch) {
        const partner = (partnersRes.data || []).find((p: any) => p.slug === locMatch[1]);
        if (partner) partnerViewMap[partner.id] = (partnerViewMap[partner.id] || 0) + 1;
      }
    });

    function scoreEvents(raw: any[]): ScoredEvent[] {
      return raw.map((e: any) => {
        const views = viewMap[e.slug] || 0;
        let score = 0;
        if (e.featured) score += 4;
        if (views > 5) score += 3;
        if (e.image_url) score += 1;
        const hour = new Date(e.date_time).getHours();
        if (hour >= 20 || hour <= 4) score += 2;
        return { ...e, score, views } as ScoredEvent;
      }).sort((a: ScoredEvent, b: ScoredEvent) => b.score - a.score);
    }

    setEvents(scoreEvents(todayRes.data || []));
    setWeekendEvents(scoreEvents(weekendRes.data || []));

    const scoredPartners: CoverPartner[] = (partnersRes.data || [])
      .map((p: any) => ({ name: p.name, logo_url: p.logo_url, views: partnerViewMap[p.id] || 0 }))
      .sort((a: CoverPartner, b: CoverPartner) => b.views - a.views)
      .slice(0, 10);
    setPartners(scoredPartners);

    setLoading(false);
  }

  const toggleType = (t: CoverType) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  // ============ CAPTIONS ============

  function captionAgenda(evts: ScoredEvent[]): { full: string; short: string } {
    const dayStr = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
    const lines = evts.slice(0, 10).map(e => {
      const h = format(new Date(e.date_time), "HH'h'mm");
      const emoji = CATEGORY_EMOJI[e.category] || "📌";
      return `${emoji} ${e.title}\n🕐 ${h}${e.venue_name ? ` · 📍 ${e.venue_name}` : ""}`;
    }).join("\n\n");
    return {
      full: `📅 AGENDA DE HOJE — ${dayStr}\n\nConfira o que rola hoje na cidade:\n\n${lines}\n\n👉 Mais info e ingressos em roxou.com.br\n\nSalva esse post pra não esquecer! 🔖`,
      short: `📅 Agenda de hoje!\n\n${evts.slice(0, 5).map(e => `• ${e.title} — ${format(new Date(e.date_time), "HH'h'")}`).join("\n")}\n\n👉 roxou.com.br`,
    };
  }

  function captionTop(evts: ScoredEvent[]): { full: string; short: string } {
    const ranked = evts.slice(0, 5).map((e, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`;
      const h = format(new Date(e.date_time), "HH'h'mm");
      return `${medal} ${e.title}\n🕐 ${h}${e.venue_name ? ` · ${e.venue_name}` : ""}`;
    }).join("\n\n");
    return {
      full: `🏆 TOP ROLÊS DE HOJE\n\n${ranked}\n\n🔥 Não fique de fora!\n👉 roxou.com.br`,
      short: `🏆 Top rolês de hoje!\n${evts.slice(0, 3).map((e, i) => `${i + 1}. ${e.title}`).join("\n")}\n\n👉 roxou.com.br`,
    };
  }

  function captionWeekend(evts: ScoredEvent[]): { full: string; short: string } {
    const lines = evts.slice(0, 8).map(e => {
      const d = new Date(e.date_time);
      const day = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"][d.getDay()];
      const h = format(d, "HH'h'mm");
      return `${day} · ${e.title} — ${h}`;
    }).join("\n");
    return {
      full: `🎉 O QUE ROLA NESTE FIM DE SEMANA\n\nSEXTA · SÁBADO · DOMINGO\n\n${lines}\n\n👉 Descubra tudo na Roxou!\nroxou.com.br`,
      short: `🎉 Fim de semana chegou!\n\n${evts.slice(0, 4).map(e => `• ${e.title}`).join("\n")}\n\n👉 roxou.com.br`,
    };
  }

  function captionPartners(pts: CoverPartner[]): { full: string; short: string } {
    const ranked = pts.slice(0, 5).map((p, i) => `#${i + 1} ${p.name} — ${p.views} acessos`).join("\n");
    return {
      full: `📍 PARCEIROS EM ALTA\n\nOs locais mais acessados da semana:\n\n${ranked}\n\n👉 Descubra mais em roxou.com.br`,
      short: `📍 Parceiros em alta!\n${pts.slice(0, 3).map((p, i) => `${i + 1}. ${p.name}`).join("\n")}\n\n👉 roxou.com.br`,
    };
  }

  // ============ GENERATION ============

  async function generateCovers() {
    if (selectedTypes.size === 0) {
      toast.error("Selecione pelo menos um tipo de capa");
      return;
    }

    const results: GeneratedCover[] = [];
    const canvas = document.createElement("canvas");

    for (const type of selectedTypes) {
      const cover: GeneratedCover = {
        type,
        label: COVER_OPTIONS.find(o => o.key === type)!.label,
        formats: { feed: null, story: null, banner: null },
        carouselSlides: [],
        flyerImages: [],
        captionFull: "",
        captionShort: "",
        generating: true,
      };

      const evts = type === "weekend" ? weekendEvents : events;

      try {
        // Generate Feed format
        if (type === "agenda") {
          cover.formats.feed = await renderCoverAgenda(canvas, evts, "feed");
          cover.formats.story = await renderCoverAgenda(canvas, evts, "story");
          const cap = captionAgenda(events);
          cover.captionFull = cap.full;
          cover.captionShort = cap.short;
        } else if (type === "top") {
          cover.formats.feed = await renderCoverTopRoles(canvas, evts.slice(0, 5), "feed");
          cover.formats.story = await renderCoverTopRoles(canvas, evts.slice(0, 5), "story");
          const cap = captionTop(events);
          cover.captionFull = cap.full;
          cover.captionShort = cap.short;
        } else if (type === "weekend") {
          cover.formats.feed = await renderCoverWeekend(canvas, evts, "feed");
          cover.formats.story = await renderCoverWeekend(canvas, evts, "story");
          const cap = captionWeekend(weekendEvents);
          cover.captionFull = cap.full;
          cover.captionShort = cap.short;
        } else if (type === "partners") {
          cover.formats.feed = await renderCoverPartners(canvas, partners, "feed");
          cover.formats.story = await renderCoverPartners(canvas, partners, "story");
          const cap = captionPartners(partners);
          cover.captionFull = cap.full;
          cover.captionShort = cap.short;
        }

        // Generate Banner Festival for non-partner types
        if (type !== "partners" && evts.length > 0) {
          cover.formats.banner = await renderBannerFestival(canvas, evts);
        }

        // Generate individual flyers for top events
        if (type !== "partners") {
          const topEvts = evts.filter(e => e.image_url).slice(0, 5);
          for (const ev of topEvts) {
            try {
              const badge = type === "top" ? "TOP ROLÊ" : type === "weekend" ? "FIM DE SEMANA" : "HOJE";
              const flyerUrl = await renderFlyer(canvas, ev, badge);
              cover.flyerImages.push(flyerUrl);
            } catch { /* skip */ }
          }
        }
      } catch (err: any) {
        toast.error(`Erro ao gerar capa ${cover.label}`, { description: err.message });
      }

      cover.generating = false;
      results.push(cover);
    }

    setCovers(results);
    setExpandedCover(0);
    toast.success(`${results.length} capa(s) gerada(s)!`);
  }

  // ============ CAROUSEL ============

  async function generateCarousel(coverIdx: number) {
    const cover = covers[coverIdx];
    if (!cover) return;

    const updated = [...covers];
    updated[coverIdx] = { ...cover, generating: true };
    setCovers(updated);

    const canvas = document.createElement("canvas");
    const slides: string[] = [];

    // Slide 1: cover
    if (cover.formats.feed) slides.push(cover.formats.feed);

    // Event slides
    const evts = cover.type === "weekend" ? weekendEvents : events;
    const topEvts = evts.filter(e => e.image_url).slice(0, 8);
    for (const ev of topEvts) {
      try {
        const badge = cover.type === "top" ? "TOP ROLÊS" : cover.type === "weekend" ? "FIM DE SEMANA" : "HOJE NA ROXOU";
        const dataUrl = await renderEventCard(canvas, ev, badge, "feed");
        slides.push(dataUrl);
      } catch { /* skip */ }
    }

    // CTA slide
    try {
      const ctaUrl = await renderCTASlide(canvas);
      slides.push(ctaUrl);
    } catch { /* skip */ }

    updated[coverIdx] = { ...cover, carouselSlides: slides, generating: false };
    setCovers([...updated]);
    toast.success(`Carrossel gerado com ${slides.length} slides!`);
  }

  // ============ BATCH ============

  const runBatch = useCallback(async (jobs: BatchJob[]) => {
    setBatchRunning(true);
    batchAbortRef.current = false;
    const updatedJobs = [...jobs];
    const updatedCovers = [...covers];

    let nextIdx = 0;
    const processing = new Set<number>();

    async function processJob(jobIdx: number) {
      const job = updatedJobs[jobIdx];
      if (!job || job.status !== "pending") return;
      job.status = "processing";
      setBatchJobs([...updatedJobs]);

      const coverIdx = updatedCovers.findIndex(c => c.type === job.coverType);
      if (coverIdx === -1) {
        job.status = "error";
        job.error = "Capa não encontrada";
        setBatchJobs([...updatedJobs]);
        return;
      }

      try {
        if (job.kind === "cover") {
          // Already generated as cover
          job.status = "done";
        } else if (job.kind === "carousel") {
          await generateCarousel(coverIdx);
          job.status = "done";
        } else if (job.kind === "reel") {
          const evts = job.coverType === "weekend" ? weekendEvents : events;
          const topEv = evts.find(e => e.image_url);
          if (topEv) {
            const canvas = document.createElement("canvas");
            const blob = await generateReel(canvas, topEv, updatedCovers[coverIdx].label);
            const url = URL.createObjectURL(blob);
            updatedCovers[coverIdx] = { ...updatedCovers[coverIdx], reelUrl: url };
            setCovers([...updatedCovers]);
          }
          job.status = "done";
        }
      } catch (err: any) {
        job.status = "error";
        job.error = err.message;
      }
      setBatchJobs([...updatedJobs]);
    }

    while (nextIdx < updatedJobs.length && !batchAbortRef.current) {
      while (processing.size < MAX_CONCURRENCY && nextIdx < updatedJobs.length) {
        if (batchAbortRef.current) break;
        const idx = nextIdx++;
        processing.add(idx);
        processJob(idx).then(() => processing.delete(idx));
      }
      await new Promise(r => setTimeout(r, 300));
    }
    while (processing.size > 0) await new Promise(r => setTimeout(r, 200));

    setBatchRunning(false);
    if (!batchAbortRef.current) toast.success("Batch completo!");
  }, [covers, events, weekendEvents]);

  function startBatchAll() {
    if (covers.length === 0) {
      toast.error("Gere as capas primeiro");
      return;
    }
    const jobs: BatchJob[] = [];
    covers.forEach(c => {
      jobs.push({ id: `car-${c.type}`, kind: "carousel", coverType: c.type, label: `Carrossel ${c.label}`, status: "pending" });
      jobs.push({ id: `reel-${c.type}`, kind: "reel", coverType: c.type, label: `Reel ${c.label}`, status: "pending" });
    });
    setBatchJobs(jobs);
    runBatch(jobs);
  }

  function startBatchCarousels() {
    if (covers.length === 0) { toast.error("Gere as capas primeiro"); return; }
    const jobs: BatchJob[] = covers.map(c => ({
      id: `car-${c.type}`, kind: "carousel" as const, coverType: c.type, label: `Carrossel ${c.label}`, status: "pending" as const,
    }));
    setBatchJobs(jobs);
    runBatch(jobs);
  }

  function startBatchReels() {
    if (covers.length === 0) { toast.error("Gere as capas primeiro"); return; }
    const jobs: BatchJob[] = covers.map(c => ({
      id: `reel-${c.type}`, kind: "reel" as const, coverType: c.type, label: `Reel ${c.label}`, status: "pending" as const,
    }));
    setBatchJobs(jobs);
    runBatch(jobs);
  }

  // ============ ZIP ============

  const hasMedia = useMemo(() =>
    covers.some(c => c.formats.feed || c.formats.story || c.formats.banner || c.flyerImages.length > 0 || c.carouselSlides.length > 0 || c.reelUrl),
    [covers]
  );

  async function downloadZip() {
    setZipping(true);
    try {
      const zip = new JSZip();
      const dateStr = format(new Date(), "yyyy-MM-dd");
      let count = 0;

      for (const cover of covers) {
        const folder = cover.type;

        // All format variants
        for (const [fmtKey, dataUrl] of Object.entries(cover.formats)) {
          if (dataUrl) {
            const res = await fetch(dataUrl);
            zip.file(`${folder}/capa_${fmtKey}.jpg`, await res.blob());
            count++;
          }
        }

        // Individual flyers
        for (let i = 0; i < cover.flyerImages.length; i++) {
          const res = await fetch(cover.flyerImages[i]);
          zip.file(`${folder}/flyer_${String(i + 1).padStart(2, "0")}.jpg`, await res.blob());
          count++;
        }

        for (let i = 0; i < cover.carouselSlides.length; i++) {
          const res = await fetch(cover.carouselSlides[i]);
          zip.file(`${folder}/carrossel_${String(i + 1).padStart(2, "0")}.jpg`, await res.blob());
          count++;
        }

        if (cover.reelUrl) {
          const res = await fetch(cover.reelUrl);
          zip.file(`${folder}/reel.webm`, await res.blob());
          count++;
        }

        if (cover.captionFull) { zip.file(`${folder}/legenda_completa.txt`, cover.captionFull); count++; }
        if (cover.captionShort) { zip.file(`${folder}/legenda_curta.txt`, cover.captionShort); count++; }
      }

      if (count === 0) { toast.error("Nenhum conteúdo para baixar"); setZipping(false); return; }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `roxou-capas-${dateStr}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`ZIP com ${count} arquivo(s)!`);
    } catch (err: any) {
      toast.error("Erro ao gerar ZIP", { description: err.message });
    } finally {
      setZipping(false);
    }
  }

  // ============ BATCH STATS ============

  const batchStats = useMemo(() => {
    const total = batchJobs.length;
    const done = batchJobs.filter(j => j.status === "done").length;
    const errors = batchJobs.filter(j => j.status === "error").length;
    const pct = total > 0 ? Math.round(((done + errors) / total) * 100) : 0;
    return { total, done, errors, pct };
  }, [batchJobs]);

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  }

  // ============ RENDER ============

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
          <Layers className="h-4 w-4 text-primary" />
          Capas & Lotes
        </h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Gere capas, carrosséis e reels automaticamente · {events.length} eventos hoje · {weekendEvents.length} no fim de semana · {partners.length} parceiros
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border/30 bg-card/80 p-3 text-center">
          <p className="text-lg font-bold text-primary">{events.length}</p>
          <p className="text-[9px] text-muted-foreground">Eventos hoje</p>
        </div>
        <div className="rounded-xl border border-border/30 bg-card/80 p-3 text-center">
          <p className="text-lg font-bold text-purple-400">{weekendEvents.length}</p>
          <p className="text-[9px] text-muted-foreground">Fim de semana</p>
        </div>
        <div className="rounded-xl border border-border/30 bg-card/80 p-3 text-center">
          <p className="text-lg font-bold text-green-400">{partners.length}</p>
          <p className="text-[9px] text-muted-foreground">Parceiros</p>
        </div>
      </div>

      {/* Cover type selector */}
      <div className="rounded-xl border border-border/40 bg-card p-3 space-y-2">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Tipos de Capa</span>
        <div className="grid grid-cols-2 gap-2">
          {COVER_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const isSelected = selectedTypes.has(opt.key);
            return (
              <button
                key={opt.key}
                onClick={() => toggleType(opt.key)}
                className={`flex items-center gap-2 rounded-lg p-2.5 text-left transition border ${isSelected ? "border-primary/30 bg-primary/5" : "border-transparent bg-card/50 hover:bg-secondary/30"}`}
              >
                <Icon className={`h-4 w-4 ${isSelected ? opt.cls : "text-muted-foreground/40"}`} />
                <span className={`text-[11px] font-semibold ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main generate button */}
      <button
        onClick={generateCovers}
        disabled={selectedTypes.size === 0}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" /> Gerar Capas Selecionadas
      </button>

      {/* Results */}
      {covers.length > 0 && (
        <div className="space-y-3">
          {/* Batch actions */}
          <div className="rounded-xl border border-border/30 bg-card p-3 space-y-3">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-primary" />
              Ações em Lote ({covers.length} capas)
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={startBatchCarousels} disabled={batchRunning}
                className="flex items-center gap-1 rounded-lg bg-primary/15 px-3 py-2 text-[10px] font-semibold text-primary hover:bg-primary/25 transition disabled:opacity-50">
                <Layers className="h-3 w-3" /> Gerar carrosséis
              </button>
              <button onClick={startBatchReels} disabled={batchRunning}
                className="flex items-center gap-1 rounded-lg bg-purple-500/15 px-3 py-2 text-[10px] font-semibold text-purple-400 hover:bg-purple-500/25 transition disabled:opacity-50">
                <Video className="h-3 w-3" /> Gerar reels
              </button>
              <button onClick={startBatchAll} disabled={batchRunning}
                className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-pink-600 to-orange-500 px-3 py-2 text-[10px] font-bold text-white hover:opacity-90 disabled:opacity-50 transition">
                <Zap className="h-3 w-3" /> Gerar tudo
              </button>
              {batchRunning && (
                <button onClick={() => { batchAbortRef.current = true; toast.info("Interrompendo..."); }}
                  className="flex items-center gap-1 rounded-lg bg-destructive/15 px-3 py-2 text-[10px] font-semibold text-destructive">
                  <Pause className="h-3 w-3" /> Parar
                </button>
              )}
              {hasMedia && !batchRunning && (
                <button onClick={downloadZip} disabled={zipping}
                  className="flex items-center gap-1 rounded-lg bg-secondary/60 px-3 py-2 text-[10px] font-semibold text-foreground hover:bg-secondary transition disabled:opacity-50">
                  {zipping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                  {zipping ? "Gerando ZIP…" : "📦 Baixar tudo (.zip)"}
                </button>
              )}
            </div>

            {/* Progress */}
            {batchJobs.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">
                    {batchRunning ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> {batchStats.done + batchStats.errors}/{batchStats.total}
                      </span>
                    ) : `Concluído: ${batchStats.done}/${batchStats.total}`}
                  </span>
                  <span className="font-bold text-primary">{batchStats.pct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary/30 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                    style={{ width: `${batchStats.pct}%` }} />
                </div>
                <div className="max-h-24 overflow-y-auto space-y-0.5">
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

          {/* Cover cards */}
          {covers.map((cover, idx) => {
            const isExpanded = expandedCover === idx;
            const opt = COVER_OPTIONS.find(o => o.key === cover.type)!;
            const Icon = opt.icon;

            return (
              <div key={cover.type} className="rounded-xl border border-border/30 bg-card overflow-hidden">
                <button
                  onClick={() => setExpandedCover(isExpanded ? null : idx)}
                  className="w-full flex items-center justify-between px-3.5 py-3 hover:bg-secondary/10 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      cover.type === "agenda" ? "bg-primary/15" :
                      cover.type === "top" ? "bg-yellow-400/15" :
                      cover.type === "weekend" ? "bg-purple-400/15" : "bg-green-400/15"
                    }`}>
                      <Icon className={`h-3.5 w-3.5 ${opt.cls}`} />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-semibold text-foreground block">{cover.label}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {cover.formats.feed ? "✅ Feed" : ""}{cover.formats.story ? " · 📱 Story" : ""}{cover.formats.banner ? " · 🎪 Banner" : ""}{cover.flyerImages.length > 0 ? ` · 🎉 ${cover.flyerImages.length} flyers` : ""}{cover.carouselSlides.length > 0 ? ` · 📸 ${cover.carouselSlides.length} slides` : ""}{cover.reelUrl ? " · 🎬 Reel" : ""}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="px-3.5 pb-4 space-y-4 border-t border-border/15">
                    {/* Actions */}
                    <div className="flex gap-2 pt-3 flex-wrap">
                      <button
                        onClick={() => generateCarousel(idx)}
                        disabled={cover.generating}
                        className="flex items-center gap-1 rounded-lg bg-primary/15 px-3 py-2 text-[10px] font-semibold text-primary hover:bg-primary/25 transition disabled:opacity-50"
                      >
                        {cover.generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Layers className="h-3 w-3" />}
                        Gerar Carrossel
                      </button>
                      <button
                        onClick={() => {
                          const params = new URLSearchParams();
                          params.set("caption", cover.captionFull);
                          if (cover.formats.feed) params.set("image", cover.formats.feed);
                          navigate(`/admin/instagram?tab=publicacao&${params.toString()}`);
                        }}
                        className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-2 text-[10px] font-bold text-white hover:opacity-90 transition"
                      >
                        <Send className="h-3 w-3" /> Enviar p/ publicação
                      </button>
                    </div>

                    {/* Format previews */}
                    <div className="space-y-3">
                      {/* Feed */}
                      {cover.formats.feed && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">📷 Feed (1080×1350)</span>
                          <div className="rounded-lg overflow-hidden border border-border/30 max-w-[240px]">
                            <img src={cover.formats.feed} alt="Feed" className="w-full" />
                          </div>
                        </div>
                      )}

                      {/* Story */}
                      {cover.formats.story && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">📱 Story (1080×1920)</span>
                          <div className="rounded-lg overflow-hidden border border-border/30 max-w-[160px]">
                            <img src={cover.formats.story} alt="Story" className="w-full" />
                          </div>
                        </div>
                      )}

                      {/* Banner */}
                      {cover.formats.banner && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">🎪 Banner Festival (1920×1080)</span>
                          <div className="rounded-lg overflow-hidden border border-border/30 max-w-[320px]">
                            <img src={cover.formats.banner} alt="Banner" className="w-full" />
                          </div>
                        </div>
                      )}

                      {/* Flyers */}
                      {cover.flyerImages.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">🎉 Flyers Individuais ({cover.flyerImages.length})</span>
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {cover.flyerImages.map((flyer, fi) => (
                              <div key={fi} className="shrink-0 rounded-lg overflow-hidden border border-border/30 w-[140px]">
                                <img src={flyer} alt={`Flyer ${fi + 1}`} className="w-full" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Carousel preview */}
                    {cover.carouselSlides.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">📸 Carrossel ({cover.carouselSlides.length} slides)</span>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {cover.carouselSlides.map((slide, si) => (
                            <div key={si} className="shrink-0 rounded-lg overflow-hidden border border-border/30 w-[140px]">
                              <img src={slide} alt={`Slide ${si + 1}`} className="w-full" />
                              <p className="text-[8px] text-center text-muted-foreground py-0.5">{si + 1}/{cover.carouselSlides.length}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reel */}
                    {cover.reelUrl && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">🎬 Reel</span>
                          <a href={cover.reelUrl} download={`roxou-reel-${cover.type}.webm`}
                            className="flex items-center gap-1 text-[9px] text-primary font-medium">
                            <Download className="h-2.5 w-2.5" /> Baixar
                          </a>
                        </div>
                        <div className="rounded-lg overflow-hidden border border-border/30 max-w-[160px]">
                          <video src={cover.reelUrl} controls muted loop playsInline className="w-full" style={{ aspectRatio: "9/16" }} />
                        </div>
                      </div>
                    )}

                    {/* Captions */}
                    <div className="space-y-2">
                      <div className="rounded-lg border border-border/20 bg-background/30 p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Legenda completa</span>
                          <button onClick={() => copyText(cover.captionFull)}
                            className="flex items-center gap-1 text-[9px] font-medium text-primary">
                            <Copy className="h-2.5 w-2.5" /> Copiar
                          </button>
                        </div>
                        <pre className="whitespace-pre-wrap text-[11px] text-foreground/90 font-sans leading-relaxed max-h-40 overflow-y-auto">
                          {cover.captionFull}
                        </pre>
                      </div>
                      <div className="rounded-lg border border-border/20 bg-background/30 p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Legenda curta</span>
                          <button onClick={() => copyText(cover.captionShort)}
                            className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground">
                            <Copy className="h-2.5 w-2.5" /> Copiar
                          </button>
                        </div>
                        <pre className="whitespace-pre-wrap text-[10px] text-muted-foreground font-sans leading-relaxed max-h-24 overflow-y-auto">
                          {cover.captionShort}
                        </pre>
                      </div>
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

export default InstagramCovers;
