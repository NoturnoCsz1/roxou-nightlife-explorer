import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Eye, Flame, TrendingUp } from "lucide-react";
import SmartImage from "@/components/v3/SmartImage";

interface Item {
  id: string;
  slug: string;
  title: string;
  cover_image_url: string | null;
  category: string;
  source: "roxou" | "expo";
  views: number;
}

export default function MostViewedNews() {
  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["v3-most-viewed-news"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: views } = await supabase
        .from("page_views")
        .select("page_path")
        .gte("created_at", since)
        .or("page_path.ilike./noticia/%,page_path.ilike./expo2026/noticia/%");

      const counts: Record<string, number> = {};
      (views || []).forEach((r: any) => {
        const path = r.page_path as string;
        if (!path) return;
        counts[path] = (counts[path] || 0) + 1;
      });

      const ranked = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12);
      if (!ranked.length) return [];

      const roxouSlugs: string[] = [];
      const expoSlugs: string[] = [];
      const slugViews: Record<string, { source: "roxou" | "expo"; views: number }> = {};
      for (const [path, v] of ranked) {
        const expoMatch = path.match(/^\/expo2026\/noticia\/(.+)$/);
        const roxouMatch = path.match(/^\/noticia\/(.+)$/);
        if (expoMatch) {
          expoSlugs.push(expoMatch[1]);
          slugViews[`expo:${expoMatch[1]}`] = { source: "expo", views: v };
        } else if (roxouMatch) {
          roxouSlugs.push(roxouMatch[1]);
          slugViews[`roxou:${roxouMatch[1]}`] = { source: "roxou", views: v };
        }
      }

      const [r, e] = await Promise.all([
        roxouSlugs.length
          ? supabase
              .from("roxou_news")
              .select("id,slug,title,cover_image_url,category")
              .eq("status", "published")
              .in("slug", roxouSlugs)
          : Promise.resolve({ data: [] as any[] }),
        expoSlugs.length
          ? supabase
              .from("expo_news")
              .select("id,slug,title,cover_image_url,category")
              .eq("status", "published")
              .in("slug", expoSlugs)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const all: Item[] = [
        ...(r.data || []).map((n: any) => ({
          ...n,
          source: "roxou" as const,
          views: slugViews[`roxou:${n.slug}`]?.views || 0,
        })),
        ...(e.data || []).map((n: any) => ({
          ...n,
          source: "expo" as const,
          views: slugViews[`expo:${n.slug}`]?.views || 0,
        })),
      ];
      return all.sort((a, b) => b.views - a.views).slice(0, 3);
    },
    staleTime: 5 * 60 * 1000,
  });

  if (items.length < 1) return null;

  return (
    <section className="px-4 pt-6 pb-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center">
          <TrendingUp className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display font-extrabold text-lg text-foreground uppercase tracking-wide">
            Mais acessadas da semana
          </h2>
          <p className="text-[10px] text-muted-foreground -mt-0.5">
            O que Prudente está lendo agora
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((n, i) => {
          const href =
            n.source === "expo" ? `/expo2026/noticia/${n.slug}` : `/noticia/${n.slug}`;
          return (
            <Link
              key={`${n.source}-${n.id}`}
              to={href}
              className="flex items-center gap-3 p-2.5 rounded-2xl bg-card border border-border/30 hover:border-primary/40 transition-all group"
            >
              <span className="font-display font-black text-3xl bg-gradient-to-b from-primary to-accent bg-clip-text text-transparent leading-none w-8 text-center shrink-0">
                {i + 1}
              </span>
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-secondary shrink-0">
                <SmartImage
                  src={n.cover_image_url}
                  alt={n.title}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider bg-accent/15 text-accent flex items-center gap-0.5">
                    <Flame className="w-2.5 h-2.5" /> Em alta
                  </span>
                  {n.source === "expo" && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider bg-primary/15 text-primary">
                      Expo
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-xs text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                  {n.title}
                </h3>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                  <Eye className="w-2.5 h-2.5" />
                  <span>{n.views.toLocaleString("pt-BR")} visualizações</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
