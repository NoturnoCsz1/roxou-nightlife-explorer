import { useState } from "react";
import { Bot, Clock, Copy, Loader2, Megaphone, Sparkles } from "lucide-react";
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

  async function generate() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("prudente-ai", { body: { mode: "studio" } });
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
