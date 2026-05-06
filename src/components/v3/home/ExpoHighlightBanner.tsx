import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, Calendar, Newspaper, TrendingUp } from "lucide-react";

export default function ExpoHighlightBanner() {
  const { data: stats } = useQuery({
    queryKey: ["v3-expo-stats"],
    queryFn: async () => {
      const [newsRes, viewsRes] = await Promise.all([
        supabase
          .from("expo_news")
          .select("id", { count: "exact", head: true })
          .eq("status", "published"),
        supabase
          .from("page_views")
          .select("id", { count: "exact", head: true })
          .ilike("page_path", "/expo2026%"),
      ]);
      return {
        newsCount: newsRes.count ?? 0,
        viewsCount: viewsRes.count ?? 0,
      };
    },
    staleTime: 10 * 60 * 1000,
  });

  return (
    <section className="px-4 pt-6 pb-2">
      <Link
        to="/expo2026"
        className="relative block rounded-3xl overflow-hidden border border-primary/40 bg-gradient-to-br from-primary/30 via-card to-accent/20 p-5 group transition-all hover:border-primary/70 hover:shadow-[0_0_50px_-10px_hsl(var(--primary)/0.6)]"
      >
        {/* Glow particles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/40 blur-[60px] pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-accent/30 blur-[50px] pointer-events-none" />

        <div className="relative flex items-start gap-3">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary/30 border border-primary/50 grid place-items-center backdrop-blur-sm">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-primary/90">
              Cobertura especial
            </span>
            <h2 className="font-display font-black text-xl text-foreground leading-tight mt-1">
              🎡 Expo Prudente 2026
            </h2>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">
              Atrações, rumores, notícias e cobertura completa em um só lugar.
            </p>
          </div>
        </div>

        <div className="relative flex flex-wrap items-center gap-3 mt-4 text-[11px] text-foreground/80">
          {stats && stats.newsCount > 0 && (
            <span className="flex items-center gap-1.5 font-semibold">
              <Newspaper className="w-3.5 h-3.5 text-primary" />
              {stats.newsCount} notícia{stats.newsCount !== 1 ? "s" : ""}
            </span>
          )}
          <span className="flex items-center gap-1.5 font-semibold">
            <Calendar className="w-3.5 h-3.5 text-accent" />
            Atrações confirmadas
          </span>
          {stats && stats.viewsCount > 100 && (
            <span className="flex items-center gap-1.5 font-semibold">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              +{Math.floor(stats.viewsCount / 1000)}k acessos
            </span>
          )}
        </div>

        <div className="relative mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-extrabold uppercase tracking-wider shadow-[0_0_20px_hsl(var(--primary)/0.5)] group-hover:translate-x-0.5 transition-transform">
          Acessar cobertura <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </Link>
    </section>
  );
}
