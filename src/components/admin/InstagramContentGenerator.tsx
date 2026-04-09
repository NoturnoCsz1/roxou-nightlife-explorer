import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, TrendingUp, Copy, Image, LayoutGrid, Utensils, Trophy, Megaphone, Loader2, Paintbrush, History, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface EventRow {
  id: string;
  title: string;
  category: string;
  date_time: string;
  venue_name: string | null;
  slug: string;
  featured: boolean;
  image_url: string | null;
}

interface PartnerRow {
  id: string;
  name: string;
  type: string;
  slug: string;
  instagram: string | null;
  short_description: string | null;
  logo_url: string | null;
}

type ContentType = "trending" | "partner" | "football" | "gastro";

const CONTENT_TEMPLATES: Record<ContentType, { icon: typeof TrendingUp; label: string; emoji: string }> = {
  trending: { icon: TrendingUp, label: "Evento em Alta", emoji: "🔥" },
  partner: { icon: Megaphone, label: "Parceiro Destaque", emoji: "📍" },
  football: { icon: Trophy, label: "Futebol", emoji: "⚽" },
  gastro: { icon: Utensils, label: "Roxou Indica", emoji: "🍔" },
};

const CATEGORY_LABELS: Record<string, string> = {
  festa: "festa/balada",
  show: "show ao vivo",
  festival: "esporte/futebol",
  sertanejo: "sertanejo",
  teatro: "teatro/cultura",
  infantil: "infantil",
  gastronomia: "gastronomia",
};

function buildArtPrompt(
  type: ContentType,
  item: EventRow | PartnerRow,
  format: "post" | "story"
): string {
  const aspect = format === "post" ? "1:1 square" : "9:16 vertical";
  const isEvent = "date_time" in item;

  const base = [
    `Modern dark-themed Instagram ${format} graphic for ROXOU events platform.`,
    `Format: ${aspect}.`,
    `Style: premium dark background (#1a1a2e), neon magenta/pink (#e91e8c) accent glow, clean typography, bold headline.`,
    `Brand: "ROXOU" logo watermark in corner.`,
  ];

  if (type === "trending" && isEvent) {
    const e = item as EventRow;
    const date = new Date(e.date_time).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
    base.push(
      `Headline: "${e.title}"`,
      `Subtext: "${date}${e.venue_name ? ` · ${e.venue_name}` : ""}"`,
      `Category: ${CATEGORY_LABELS[e.category] || e.category}`,
      `Vibe: energetic, fire emoji accents, trending badge.`
    );
  } else if (type === "football" && isEvent) {
    const e = item as EventRow;
    const date = new Date(e.date_time).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
    base.push(
      `Headline: "${e.title}"`,
      `Subtext: "${date}${e.venue_name ? ` · ${e.venue_name}` : ""}"`,
      `Theme: football/soccer, green accent (#22c55e) glow, stadium feel.`,
      `Add subtle soccer ball icon or field lines in background.`
    );
  } else if (type === "partner" && !isEvent) {
    const p = item as PartnerRow;
    base.push(
      `Headline: "${p.name}"`,
      `Subtext: "${p.short_description || p.type}"`,
      `Theme: partner spotlight, blue accent highlights, elegant.`,
      `Badge: "PARCEIRO ROXOU"`
    );
  } else if (type === "gastro" && !isEvent) {
    const p = item as PartnerRow;
    base.push(
      `Headline: "${p.name}"`,
      `Subtext: "${p.short_description || "Recomendado pelo Roxou"}"`,
      `Theme: food/gastronomy, warm amber/orange accents, appetizing.`,
      `Badge: "ROXOU INDICA"`
    );
  }

  return base.join("\n");
}

const generatePostCopy = (type: ContentType, item: EventRow | PartnerRow, isStory = false) => {
  const br = "\n";
  if (type === "trending") {
    const e = item as EventRow;
    const date = new Date(e.date_time).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    if (isStory) {
      return `🔥 EM ALTA NO ROXOU${br}${br}${e.title}${br}📅 ${date}${br}${e.venue_name ? `📍 ${e.venue_name}` : ""}${br}${br}Arrasta pra cima e confira! 👆`;
    }
    return `🔥 EVENTO EM ALTA${br}${br}${e.title}${br}${br}📅 ${date}${br}${e.venue_name ? `📍 ${e.venue_name}${br}` : ""}${br}Não perca! Link na bio 🔗${br}${br}#roxou #eventos #${e.category} #presidenteprudente`;
  }
  if (type === "partner") {
    const p = item as PartnerRow;
    if (isStory) {
      return `📍 PARCEIRO ROXOU${br}${br}${p.name}${br}${p.short_description || ""}${br}${p.instagram ? `@${p.instagram.replace("@", "")}` : ""}${br}${br}Confira no Roxou! 👆`;
    }
    return `📍 PARCEIRO DESTAQUE${br}${br}${p.name}${br}${p.short_description || ""}${br}${br}${p.instagram ? `Siga: @${p.instagram.replace("@", "")}${br}` : ""}${br}#roxou #parceiro #presidenteprudente #${p.type}`;
  }
  if (type === "football") {
    const e = item as EventRow;
    const date = new Date(e.date_time).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    if (isStory) {
      return `⚽ BOLA ROLANDO!${br}${br}${e.title}${br}📅 ${date}${br}${e.venue_name ? `📍 ${e.venue_name}` : ""}${br}${br}Vem pro jogo! 👆`;
    }
    return `⚽ FUTEBOL NO ROXOU${br}${br}${e.title}${br}${br}📅 ${date}${br}${e.venue_name ? `📍 ${e.venue_name}${br}` : ""}${br}Bora torcer! 🏟️${br}${br}#roxou #futebol #presidenteprudente #esporte`;
  }
  const p = item as PartnerRow;
  if (isStory) {
    return `🍔 ROXOU INDICA${br}${br}${p.name}${br}${p.short_description || "Descubra este lugar incrível!"}${br}${br}Confira no Roxou! 👆`;
  }
  return `🍔 ROXOU INDICA${br}${br}${p.name}${br}${p.short_description || "Um lugar que você precisa conhecer!"}${br}${br}${p.instagram ? `📸 @${p.instagram.replace("@", "")}${br}` : ""}${br}#roxou #roxouindica #gastronomia #presidenteprudente #${p.type}`;
};

interface GenerationRecord {
  id: string;
  type: string;
  source_type: string;
  source_id: string | null;
  title: string | null;
  generated_text: string | null;
  image_url: string | null;
  created_at: string;
}

const InstagramContentGenerator = () => {
  const [trendingEvents, setTrendingEvents] = useState<EventRow[]>([]);
  const [lowPerformEvents, setLowPerformEvents] = useState<EventRow[]>([]);
  const [topPartners, setTopPartners] = useState<PartnerRow[]>([]);
  const [gastroPartners, setGastroPartners] = useState<PartnerRow[]>([]);
  const [footballEvents, setFootballEvents] = useState<EventRow[]>([]);
  const [generatedContent, setGeneratedContent] = useState<{ type: string; text: string } | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [artPromptPreview, setArtPromptPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate");
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hFilterType, setHFilterType] = useState<string>("all");
  const [hFilterSource, setHFilterSource] = useState<string>("all");
  const [hFilterContent, setHFilterContent] = useState<string>("all");
  // Track current generation context for saving
  const [currentGenCtx, setCurrentGenCtx] = useState<{ sourceType: ContentType; sourceId: string; title: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const now = new Date().toISOString();
    const since24h = new Date(Date.now() - 86400000).toISOString();

    const [eventsRes, partnersRes, viewsRes] = await Promise.all([
      supabase.from("events").select("id, title, category, date_time, venue_name, slug, featured, image_url").eq("status", "published").gte("date_time", now).order("date_time"),
      supabase.from("partners").select("id, name, type, slug, instagram, short_description, logo_url").eq("active", true),
      supabase.from("page_views").select("event_id").gte("created_at", since24h).not("event_id", "is", null),
    ]);

    const events = (eventsRes.data || []) as EventRow[];
    const partners = (partnersRes.data || []) as PartnerRow[];
    const views = viewsRes.data || [];

    const viewMap: Record<string, number> = {};
    views.forEach((v) => { if (v.event_id) viewMap[v.event_id] = (viewMap[v.event_id] || 0) + 1; });

    const sorted = [...events].sort((a, b) => (viewMap[b.id] || 0) - (viewMap[a.id] || 0));
    setTrendingEvents(sorted.slice(0, 5));
    setLowPerformEvents(events.filter((e) => !viewMap[e.id]).slice(0, 5));
    setFootballEvents(events.filter((e) => e.category === "festival").slice(0, 5));
    setTopPartners(partners.filter((p) => p.instagram).slice(0, 5));

    const gastroTypes = ["bar", "restaurant", "restaurante", "lanchonete", "pizzaria", "cafeteria"];
    setGastroPartners(partners.filter((p) => gastroTypes.includes(p.type.toLowerCase())).slice(0, 5));
  };

  const saveGeneration = async (type: string, sourceType: string, sourceId: string, title: string, text: string | null, imageUrl: string | null) => {
    await supabase.from("content_generations" as any).insert({
      type,
      source_type: sourceType,
      source_id: sourceId,
      title,
      generated_text: text,
      image_url: imageUrl,
    } as any);
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    const { data } = await supabase
      .from("content_generations" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    setHistory((data as any as GenerationRecord[]) || []);
    setHistoryLoading(false);
  };

  const handleGenerate = (type: ContentType, item: EventRow | PartnerRow, isStory = false) => {
    const text = generatePostCopy(type, item, isStory);
    const title = "title" in item ? item.title : (item as PartnerRow).name;
    setGeneratedContent({ type: isStory ? "Story" : "Post", text });
    setCurrentGenCtx({ sourceType: type, sourceId: item.id, title });
    // Save text generation
    saveGeneration(isStory ? "story" : "post", type, item.id, title, text, null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Texto copiado!");
  };

  const handleGenerateArt = async (type: ContentType, item: EventRow | PartnerRow, format: "post" | "story") => {
    const prompt = buildArtPrompt(type, item, format);
    const title = "title" in item ? item.title : (item as PartnerRow).name;
    setArtPromptPreview(prompt);
    setGeneratedImage(null);
    setGeneratingImage(true);
    setCurrentGenCtx({ sourceType: type, sourceId: item.id, title });

    try {
      const { data, error } = await supabase.functions.invoke("generate-art", {
        body: {
          prompt,
          format,
          referenceImage: "image_url" in item ? (item as EventRow).image_url : "logo_url" in item ? (item as PartnerRow).logo_url : null,
        },
      });

      if (error) throw error;
      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast.success(`Arte ${format} gerada!`);
        saveGeneration(format, type, item.id, title, null, data.imageUrl);
      } else {
        toast.error("Não foi possível gerar a arte");
      }
    } catch (err: any) {
      toast.error("Erro ao gerar arte", { description: err.message });
      // Keep prompt visible so user can copy it
    } finally {
      setGeneratingImage(false);
    }
  };

  const OpportunityCard = ({ item, type, viewCount }: { item: EventRow | PartnerRow; type: ContentType; viewCount?: number }) => {
    const config = CONTENT_TEMPLATES[type];
    const Icon = config.icon;
    const isEvent = "date_time" in item;
    const title = isEvent ? (item as EventRow).title : (item as PartnerRow).name;
    const subtitle = isEvent
      ? new Date((item as EventRow).date_time).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
      : (item as PartnerRow).type;

    return (
      <div className="rounded-lg border border-border/30 bg-card/50 p-3 space-y-2">
        <div className="flex items-start gap-2">
          <div className="rounded-md bg-primary/10 p-1.5 shrink-0">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{title}</p>
            <p className="text-[10px] text-muted-foreground">{subtitle} {viewCount !== undefined && `· ${viewCount} views`}</p>
          </div>
          <span className="text-sm shrink-0">{config.emoji}</span>
        </div>
        {/* Copy buttons */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => handleGenerate(type, item, false)}
            className="flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/25 transition"
          >
            <Image className="h-3 w-3" /> GERAR POST
          </button>
          <button
            onClick={() => handleGenerate(type, item, true)}
            className="flex items-center gap-1 rounded-md bg-accent/15 px-2 py-1 text-[10px] font-semibold text-accent hover:bg-accent/25 transition"
          >
            <LayoutGrid className="h-3 w-3" /> GERAR STORY
          </button>
        </div>
        {/* Art buttons */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => handleGenerateArt(type, item, "post")}
            disabled={generatingImage}
            className="flex items-center gap-1 rounded-md bg-secondary/50 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition disabled:opacity-50"
          >
            <Paintbrush className="h-3 w-3" /> GERAR ARTE POST
          </button>
          <button
            onClick={() => handleGenerateArt(type, item, "story")}
            disabled={generatingImage}
            className="flex items-center gap-1 rounded-md bg-secondary/50 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition disabled:opacity-50"
          >
            <Paintbrush className="h-3 w-3" /> GERAR ARTE STORY
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("generate")}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${activeTab === "generate" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground"}`}
        >
          <Instagram className="h-3.5 w-3.5" /> Gerar Conteúdo
        </button>
        <button
          onClick={() => { setActiveTab("history"); loadHistory(); }}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${activeTab === "history" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground"}`}
        >
          <History className="h-3.5 w-3.5" /> Histórico
        </button>
      </div>

      {activeTab === "history" && (
        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <History className="h-4 w-4 text-primary" /> Histórico de Gerações
            </h3>
            <button onClick={loadHistory} className="text-xs text-muted-foreground hover:text-foreground">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum conteúdo gerado ainda.</p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {history.map((h) => (
                <div key={h.id} className="rounded-lg border border-border/30 bg-card/50 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${h.type === "story" ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"}`}>
                        {h.type}
                      </span>
                      <span className="ml-1.5 text-[10px] text-muted-foreground">{h.source_type}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(h.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {h.title && <p className="text-xs font-semibold text-foreground">{h.title}</p>}
                  {h.generated_text && (
                    <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground bg-background/50 rounded-md p-2 font-sans leading-relaxed max-h-32 overflow-y-auto">
                      {h.generated_text}
                    </pre>
                  )}
                  {h.image_url && (
                    <img src={h.image_url} alt="Arte gerada" className="rounded-md max-h-40 mx-auto" />
                  )}
                  <div className="flex gap-1.5">
                    {h.generated_text && (
                      <button
                        onClick={() => handleCopy(h.generated_text!)}
                        className="flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/25 transition"
                      >
                        <Copy className="h-3 w-3" /> COPIAR
                      </button>
                    )}
                    {h.image_url && (
                      <button
                        onClick={() => { setGeneratedImage(h.image_url); setActiveTab("generate"); }}
                        className="flex items-center gap-1 rounded-md bg-accent/15 px-2 py-1 text-[10px] font-semibold text-accent hover:bg-accent/25 transition"
                      >
                        <Paintbrush className="h-3 w-3" /> VER ARTE
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "generate" && (<>
      {/* Generated content preview */}
      {generatedContent && (
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Instagram className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Conteúdo Gerado — {generatedContent.type}</h3>
            </div>
            <button onClick={() => setGeneratedContent(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
          </div>
          <pre className="whitespace-pre-wrap text-xs text-foreground bg-card rounded-lg p-3 border border-border/30 font-sans leading-relaxed">
            {generatedContent.text}
          </pre>
          <button
            onClick={() => handleCopy(generatedContent.text)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            <Copy className="h-3.5 w-3.5" /> COPIAR COPY
          </button>
        </div>
      )}

      {/* Generated art preview */}
      {(generatingImage || generatedImage || artPromptPreview) && (
        <div className="rounded-xl border-2 border-accent/30 bg-accent/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paintbrush className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-bold text-foreground">Arte Gerada</h3>
            </div>
            <button
              onClick={() => { setGeneratedImage(null); setArtPromptPreview(null); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >✕</button>
          </div>

          {generatingImage && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <span className="ml-2 text-xs text-muted-foreground">Gerando arte…</span>
            </div>
          )}

          {generatedImage && (
            <div className="space-y-2">
              <img src={generatedImage} alt="Arte gerada" className="rounded-lg max-h-80 mx-auto" />
              <div className="flex gap-2">
                <a
                  href={generatedImage}
                  download="roxou-art.png"
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:opacity-90 transition"
                >
                  ⬇ BAIXAR
                </a>
              </div>
            </div>
          )}

          {artPromptPreview && (
            <details className="text-xs">
              <summary className="text-muted-foreground cursor-pointer hover:text-foreground transition">Ver prompt usado</summary>
              <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground bg-card rounded-lg p-3 border border-border/30 font-sans leading-relaxed mt-2">
                {artPromptPreview}
              </pre>
              <button
                onClick={() => handleCopy(artPromptPreview)}
                className="flex items-center gap-1 mt-2 rounded-lg bg-secondary/50 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition"
              >
                <Copy className="h-3 w-3" /> COPIAR PROMPT
              </button>
            </details>
          )}
        </div>
      )}

      {/* Opportunities grid */}
      <div className="rounded-xl border border-border/40 bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Instagram className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">📢 OPORTUNIDADES DE POST</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {trendingEvents.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-primary flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Em alta (24h)
              </h4>
              {trendingEvents.slice(0, 3).map((e) => (
                <OpportunityCard key={e.id} item={e} type="trending" />
              ))}
            </div>
          )}

          {lowPerformEvents.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                ⚠️ Precisam de divulgação
              </h4>
              {lowPerformEvents.slice(0, 3).map((e) => (
                <OpportunityCard key={e.id} item={e} type="trending" viewCount={0} />
              ))}
            </div>
          )}

          {footballEvents.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-primary flex items-center gap-1">
                <Trophy className="h-3 w-3" /> Futebol
              </h4>
              {footballEvents.slice(0, 3).map((e) => (
                <OpportunityCard key={e.id} item={e} type="football" />
              ))}
            </div>
          )}

          {topPartners.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-accent flex items-center gap-1">
                <Megaphone className="h-3 w-3" /> Parceiros Destaque
              </h4>
              {topPartners.slice(0, 3).map((p) => (
                <OpportunityCard key={p.id} item={p} type="partner" />
              ))}
            </div>
          )}
        </div>
      </div>

      {gastroPartners.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Utensils className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">🍔 ROXOU INDICA — Gastronomia</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {gastroPartners.map((p) => (
              <OpportunityCard key={p.id} item={p} type="gastro" />
            ))}
          </div>
        </div>
      )}
      </>)}
    </div>
  );
};

export default InstagramContentGenerator;
