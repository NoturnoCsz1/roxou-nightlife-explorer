import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, MapPin, Bookmark, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePageTracking } from "@/hooks/usePageTracking";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const categoryConfig: Record<string, { label: string; badge: string }> = {
  balada: { label: "Balada", badge: "badge-balada" },
  show: { label: "Show", badge: "badge-show" },
  bar: { label: "Bar", badge: "badge-bar" },
  festival: { label: "Festival", badge: "badge-festival" },
  sertanejo: { label: "Sertanejo", badge: "badge-sertanejo" },
  funk: { label: "Funk", badge: "badge-funk" },
  eletronica: { label: "Eletrônica", badge: "badge-eletronica" },
  festa: { label: "Festa", badge: "badge-balada" },
};

const EventDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Tables<"events"> | null>(null);
  const [partner, setPartner] = useState<Tables<"partners"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  usePageTracking({ event_id: event?.id });

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug!)
        .eq("status", "published")
        .single();
      setEvent(data);
      if (data?.partner_id) {
        const { data: p } = await supabase.from("partners").select("*").eq("id", data.partner_id).single();
        setPartner(p);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  if (!event) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><p className="text-muted-foreground">Evento não encontrado.</p></div>;
  }

  const dt = new Date(event.date_time);
  const isToday = dt.toDateString() === new Date().toDateString();
  const cat = categoryConfig[event.category] || { label: event.category, badge: "bg-secondary" };
  const image = event.image_url || "/placeholder.svg";
  const time = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dateFormatted = dt.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  const handleSave = () => { setSaved(!saved); toast(saved ? "Evento removido dos salvos" : "Evento salvo! ✨"); };
  const handleShare = async () => {
    if (navigator.share) { await navigator.share({ title: event.title, text: event.description || "", url: window.location.href }); }
    else { await navigator.clipboard.writeText(window.location.href); toast("Link copiado! 🔗"); }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="relative">
        <img src={image} alt={event.title} className="aspect-[3/4] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/20" />
        <button onClick={() => navigate(-1)} className="absolute left-4 top-4 rounded-full glass p-2.5 text-foreground transition hover:neon-border">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="absolute left-4 top-16 flex gap-2">
          {isToday && <span className="badge-hoje rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">Hoje</span>}
          <span className={`${cat.badge} rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider`}>{cat.label}</span>
        </div>
      </div>

      <div className="mx-auto max-w-lg -mt-24 relative z-10 px-4 pb-10">
        <h1 className="text-2xl font-black text-foreground font-display neon-text mb-1 leading-tight">{event.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{event.venue_name}</p>

        <div className="space-y-2.5 mb-6">
          <div className="flex items-center gap-4 rounded-2xl bg-card p-4 card-shadow">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shrink-0"><Calendar className="h-5 w-5 text-primary-foreground" /></div>
            <div><p className="text-sm font-semibold text-foreground capitalize">{dateFormatted}</p><p className="text-[11px] text-muted-foreground">Data do evento</p></div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-card p-4 card-shadow">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shrink-0"><Clock className="h-5 w-5 text-primary-foreground" /></div>
            <div><p className="text-sm font-semibold text-foreground">{time}</p><p className="text-[11px] text-muted-foreground">Horário de início</p></div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-card p-4 card-shadow">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shrink-0"><MapPin className="h-5 w-5 text-primary-foreground" /></div>
            <div><p className="text-sm font-semibold text-foreground">{event.venue_name}</p><p className="text-[11px] text-muted-foreground">{event.address}</p></div>
          </div>
        </div>

        {/* Partner info */}
        {partner && (
          <div className="flex items-center gap-3 rounded-2xl bg-card p-4 card-shadow mb-6">
            {partner.logo_url ? (
              <img src={partner.logo_url} alt={partner.name} className="h-10 w-10 rounded-xl object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-xs font-bold text-secondary-foreground">
                {partner.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">{partner.name}</p>
              {partner.short_description && <p className="text-[11px] text-muted-foreground">{partner.short_description}</p>}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="mb-2 text-base font-black font-display text-foreground">Sobre o evento</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{event.description}</p>
        </div>

        <div className="flex gap-3">
          <button onClick={handleSave} className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all active:scale-95 ${saved ? "gradient-primary text-primary-foreground neon-glow" : "bg-card text-foreground card-shadow hover:neon-border"}`}>
            <Bookmark className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />{saved ? "Salvo" : "Salvar"}
          </button>
          <button onClick={handleShare} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-card py-4 text-sm font-bold text-foreground card-shadow transition-all active:scale-95 hover:neon-border">
            <Share2 className="h-5 w-5" />Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
