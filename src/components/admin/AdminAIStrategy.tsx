import { useEffect, useState } from "react";
import { Bot, Clock, Copy, Loader2, Megaphone, MousePointerClick, Rocket, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Strategy {
  story_ideas: string[];
  offer_copy: string;
  ideal_post_time: string;
  weather_reason: string;
}

export default function AdminAIStrategy() {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<any[]>([]);
  const [partnerId, setPartnerId] = useState<string>("");
  const [metrics, setMetrics] = useState({ recommendations: 0, clicks: 0 });
  const [boosting, setBoosting] = useState(false);

  useEffect(() => {
    supabase.from("partners").select("id,name").eq("active", true).order("name").then(({ data }) => setPartners(data || []));
  }, []);

  useEffect(() => {
    if (!partnerId) return;
    loadMetrics(partnerId);
  }, [partnerId]);

  async function loadMetrics(id: string) {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [{ count: recCount }, eventsRes] = await Promise.all([
      supabase.from("ai_partner_recommendations" as any).select("id", { count: "exact", head: true }).eq("partner_id", id).gte("created_at", since),
      supabase.from("events").select("id").eq("partner_id", id),
    ]);
    const eventIds = (eventsRes.data || []).map((e: any) => e.id);
    const { count: clickCount } = eventIds.length
      ? await supabase.from("ticket_clicks").select("id", { count: "exact", head: true }).in("event_id", eventIds)
      : { count: 0 } as any;
    setMetrics({ recommendations: recCount || 0, clicks: clickCount || 0 });
  }

  async function generate() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("prudente-ai", { body: { mode: "studio", partner_id: partnerId || undefined } });
      if (error) throw error;
      setStrategy(data as Strategy);
      toast.success("Estratégia IA gerada");
    } catch (err: any) {
      toast.error("Erro ao gerar estratégia", { description: err.message });
    } finally {
      setLoading(false);
    }
  }

  const copyAll = () => {
    if (!strategy) return;
    const text = [`PAUTAS STORIES`, ...strategy.story_ideas.map((s, i) => `${i + 1}. ${s}`), ``, `OFERTA`, strategy.offer_copy, ``, `HORÁRIO`, strategy.ideal_post_time, strategy.weather_reason].join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Estratégia copiada");
  };

  async function boostPartner() {
    if (!partnerId) { toast.error("Selecione um parceiro para impulsionar."); return; }
    setBoosting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) throw new Error("Sessão expirada");
      const { error } = await supabase.from("ai_partner_boosts" as any).insert({
        partner_id: partnerId,
        created_by: userId,
        priority: 10,
        payment_status: "pending",
        note: "Impulsionamento IA 24h criado pelo Admin Studio",
      });
      if (error) throw error;
      toast.success("Parceiro marcado como Recomendação Prioritária por 24h");
    } catch (err: any) {
      toast.error("Erro ao impulsionar", { description: err.message });
    } finally {
      setBoosting(false);
    }
  }

  return (
    <section className="rounded-3xl border border-primary/30 bg-card/80 p-4 space-y-4 v3-pulse-glow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center neon-glow">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-base font-black text-foreground">Estratégia IA do Dia</h2>
            <p className="text-[11px] text-muted-foreground">Consultoria inteligente para vender mais stories, ofertas e reservas.</p>
          </div>
        </div>
        <button onClick={generate} disabled={loading} className="rounded-2xl bg-primary px-3 py-2 text-[11px] font-black text-primary-foreground disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar"}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className="rounded-2xl border border-border/40 bg-background/60 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50">
          <option value="">Todos os parceiros</option>
          {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={boostPartner} disabled={boosting || !partnerId} className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] font-black uppercase text-primary disabled:opacity-50">
          {boosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Impulsionar com IA
        </button>
      </div>

      {partnerId && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-primary/25 bg-primary/10 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-primary"><TrendingUp className="h-3 w-3" /> IA recomendou</div>
            <p className="mt-1 font-display text-2xl font-black text-foreground">{metrics.recommendations}</p>
            <p className="text-[10px] text-muted-foreground">últimos 30 dias</p>
          </div>
          <div className="rounded-2xl border border-accent/25 bg-accent/10 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-accent"><MousePointerClick className="h-3 w-3" /> Cliques</div>
            <p className="mt-1 font-display text-2xl font-black text-foreground">{metrics.clicks}</p>
            <p className="text-[10px] text-muted-foreground">ingressos/eventos</p>
          </div>
        </div>
      )}

      {strategy ? (
        <div className="space-y-3">
          <div className="grid gap-2">
            {strategy.story_ideas.map((idea, index) => (
              <div key={idea} className="rounded-2xl border border-border/30 bg-background/40 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-primary">
                  <Sparkles className="h-3 w-3" /> Pauta {index + 1}
                </div>
                <p className="text-xs leading-relaxed text-foreground">{idea}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-accent/25 bg-accent/10 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-accent">
              <Megaphone className="h-3 w-3" /> Oferta irresistível
            </div>
            <p className="text-xs leading-relaxed text-foreground">{strategy.offer_copy}</p>
          </div>
          <div className="rounded-2xl border border-border/30 bg-background/40 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-primary">
              <Clock className="h-3 w-3" /> Horário ideal
            </div>
            <p className="text-xs font-bold text-foreground">{strategy.ideal_post_time}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{strategy.weather_reason}</p>
          </div>
          <button onClick={copyAll} className="inline-flex items-center gap-1.5 rounded-xl border border-border/40 px-3 py-2 text-[11px] font-bold text-muted-foreground hover:text-foreground">
            <Copy className="h-3.5 w-3.5" /> Copiar estratégia
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/25 bg-background/30 p-4 text-center text-xs text-muted-foreground">
          Gere uma consultoria com base nos eventos cadastrados, clima de Prudente e timing de postagem.
        </div>
      )}
    </section>
  );
}
