import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CloudSun, PiggyBank, Sparkles, ArrowRight, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HomeAIData {
  greeting: string;
  weather: string;
  economy_tip: string;
  role_suggestion: string;
}

export default function AIHomeWidget() {
  const { data, isLoading } = useQuery<HomeAIData>({
    queryKey: ["prudente-ai-home-widget"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("prudente-ai", { body: { mode: "home" } });
      if (error) throw error;
      return data as HomeAIData;
    },
    staleTime: 1000 * 60 * 20,
  });

  return (
    <section className="px-4 pt-4 pb-2">
      <Link to="/v3/ia" className="group block rounded-3xl v3-glass-strong v3-pulse-glow overflow-hidden active:scale-[0.98] transition-transform">
        <div className="relative p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                <Bot className="h-3.5 w-3.5" /> Prudente IA ao vivo
              </div>
              <h2 className="mt-1 font-display text-xl font-black text-foreground">
                {isLoading ? "Bom dia, Prudente!" : data?.greeting || "Bom dia, Prudente!"}
              </h2>
            </div>
            <ArrowRight className="mt-1 h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
          </div>

          <div className="relative mt-4 grid grid-cols-1 gap-2">
            <WidgetLine icon={CloudSun} label="Clima" text={data?.weather || "Calculando clima de Prudente..."} />
            <WidgetLine icon={PiggyBank} label="Economia" text={data?.economy_tip || "Buscando happy hours e atalhos pra gastar menos."} />
            <WidgetLine icon={Sparkles} label="Rolê IA" text={data?.role_suggestion || "Cruzando agenda, bares e horários da noite."} />
          </div>
        </div>
      </Link>
    </section>
  );
}

function WidgetLine({ icon: Icon, label, text }: { icon: any; label: string; text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-border/25 bg-background/25 px-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-black text-foreground">{label}: </span>{text}
      </p>
    </div>
  );
}
