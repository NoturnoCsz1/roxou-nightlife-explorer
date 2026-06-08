import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CloudSun, PiggyBank, Sparkles, ArrowRight } from "lucide-react";
import AuraAvatar from "@/components/v3/AuraAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useV3Profile } from "@/hooks/useV3Profile";

interface HomeAIData {
  greeting: string;
  weather: string;
  economy_tip: string;
  role_suggestion: string;
}

function getDaypartGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function AIHomeWidget() {
  const { user, profile } = useV3Profile();
  const { data, isLoading } = useQuery<HomeAIData>({
    queryKey: ["prudente-ai-home-widget"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("prudente-ai", { body: { mode: "home" } });
      if (error) throw error;
      return data as HomeAIData;
    },
    staleTime: 1000 * 60 * 20,
  });

  const daypart = getDaypartGreeting();
  const nickname = (profile as any)?.nickname?.trim();
  const displayName = nickname || (profile?.display_name?.split(" ")[0]) || "Prudente";
  const greeting = `${daypart}, ${displayName}!`;

  return (
    <section className="px-4 pt-4 pb-2">
      <Link to="/ia" className="group block rounded-3xl v3-glass-strong v3-pulse-glow overflow-hidden active:scale-[0.98] transition-transform">
        <div className="relative p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                <AuraAvatar className="h-4 w-4 rounded-full" glow={false} /> Aura ao vivo 💜
              </div>
              <h2 className="mt-1 font-display text-xl font-black text-foreground">
                {greeting}
              </h2>
              {!user && (
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-bold text-primary">Faça seu cadastro</span> para recomendações exclusivas!
                </p>
              )}
            </div>
            <ArrowRight className="mt-1 h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
          </div>

          <div className="relative mt-4 grid grid-cols-1 gap-2">
            <WidgetLine icon={CloudSun} label="Clima" text={data?.weather} loading={isLoading} />
            <WidgetLine icon={PiggyBank} label="Economia" text={data?.economy_tip} loading={isLoading} />
            <WidgetLine icon={Sparkles} label="Roxou indica" text={data?.role_suggestion} loading={isLoading} />
          </div>
        </div>
      </Link>
    </section>
  );
}

function WidgetLine({ icon: Icon, label, text, loading }: { icon: any; label: string; text?: string; loading?: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-border/25 bg-background/25 px-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      {loading && !text ? (
        <div className="flex-1 py-0.5 space-y-1.5" aria-hidden="true">
          <div className="v3-skeleton h-2.5 w-20 rounded-full" />
          <div className="v3-skeleton h-2 w-full rounded-full" />
          <div className="v3-skeleton h-2 w-3/4 rounded-full" />
        </div>
      ) : (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-black text-foreground">{label}: </span>{text || "—"}
        </p>
      )}
    </div>
  );
}
