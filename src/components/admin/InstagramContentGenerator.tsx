import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, TrendingUp, Copy, Image, LayoutGrid, Utensils, Trophy, Megaphone } from "lucide-react";
import { toast } from "sonner";

interface EventRow {
  id: string;
  title: string;
  category: string;
  date_time: string;
  venue_name: string | null;
  slug: string;
  featured: boolean;
}

interface PartnerRow {
  id: string;
  name: string;
  type: string;
  slug: string;
  instagram: string | null;
  short_description: string | null;
}

type ContentType = "trending" | "partner" | "football" | "gastro";

const CONTENT_TEMPLATES: Record<ContentType, { icon: typeof TrendingUp; label: string; emoji: string }> = {
  trending: { icon: TrendingUp, label: "Evento em Alta", emoji: "🔥" },
  partner: { icon: Megaphone, label: "Parceiro Destaque", emoji: "📍" },
  football: { icon: Trophy, label: "Futebol", emoji: "⚽" },
  gastro: { icon: Utensils, label: "Roxou Indica", emoji: "🍔" },
};

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
  // gastro
  const p = item as PartnerRow;
  if (isStory) {
    return `🍔 ROXOU INDICA${br}${br}${p.name}${br}${p.short_description || "Descubra este lugar incrível!"}${br}${br}Confira no Roxou! 👆`;
  }
  return `🍔 ROXOU INDICA${br}${br}${p.name}${br}${p.short_description || "Um lugar que você precisa conhecer!"}${br}${br}${p.instagram ? `📸 @${p.instagram.replace("@", "")}${br}` : ""}${br}#roxou #roxouindica #gastronomia #presidenteprudente #${p.type}`;
};

const InstagramContentGenerator = () => {
  const [trendingEvents, setTrendingEvents] = useState<EventRow[]>([]);
  const [lowPerformEvents, setLowPerformEvents] = useState<EventRow[]>([]);
  const [topPartners, setTopPartners] = useState<PartnerRow[]>([]);
  const [gastroPartners, setGastroPartners] = useState<PartnerRow[]>([]);
  const [footballEvents, setFootballEvents] = useState<EventRow[]>([]);
  const [generatedContent, setGeneratedContent] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const now = new Date().toISOString();
    const since24h = new Date(Date.now() - 86400000).toISOString();

    const [eventsRes, partnersRes, viewsRes] = await Promise.all([
      supabase.from("events").select("id, title, category, date_time, venue_name, slug, featured").eq("status", "published").gte("date_time", now).order("date_time"),
      supabase.from("partners").select("id, name, type, slug, instagram, short_description").eq("active", true),
      supabase.from("page_views").select("event_id").gte("created_at", since24h).not("event_id", "is", null),
    ]);

    const events = eventsRes.data || [];
    const partners = partnersRes.data || [];
    const views = viewsRes.data || [];

    // Count views per event
    const viewMap: Record<string, number> = {};
    views.forEach((v) => { if (v.event_id) viewMap[v.event_id] = (viewMap[v.event_id] || 0) + 1; });

    // Trending (most views)
    const sorted = [...events].sort((a, b) => (viewMap[b.id] || 0) - (viewMap[a.id] || 0));
    setTrendingEvents(sorted.slice(0, 5));

    // Low performing (upcoming events with 0 views)
    setLowPerformEvents(events.filter((e) => !viewMap[e.id]).slice(0, 5));

    // Football events
    setFootballEvents(events.filter((e) => e.category === "festival").slice(0, 5));

    // Top partners (those with instagram)
    setTopPartners(partners.filter((p) => p.instagram).slice(0, 5));

    // Gastro partners
    const gastroTypes = ["bar", "restaurant", "restaurante", "lanchonete", "pizzaria", "cafeteria"];
    setGastroPartners(partners.filter((p) => gastroTypes.includes(p.type.toLowerCase())).slice(0, 5));
  };

  const handleGenerate = (type: ContentType, item: EventRow | PartnerRow, isStory = false) => {
    const text = generatePostCopy(type, item, isStory);
    setGeneratedContent({ type: isStory ? "Story" : "Post", text });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Texto copiado!");
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
        <div className="flex gap-1.5">
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
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Generated content preview */}
      {generatedContent && (
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Instagram className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Conteúdo Gerado — {generatedContent.type}</h3>
            </div>
            <button
              onClick={() => setGeneratedContent(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >✕</button>
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

      {/* Opportunities grid */}
      <div className="rounded-xl border border-border/40 bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Instagram className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">📢 OPORTUNIDADES DE POST</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Trending */}
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

          {/* Low performing */}
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

          {/* Football */}
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

          {/* Top Partners */}
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

      {/* Roxou Indica */}
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
    </div>
  );
};

export default InstagramContentGenerator;
