import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Newspaper, Flame, ChevronRight } from "lucide-react";
import SmartImage from "@/components/v3/SmartImage";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NewsItem {
  id: string;
  slug: string;
  title: string;
  cover_image_url: string | null;
  category: string;
  published_at: string | null;
  source: "roxou" | "expo";
}

const MAX_DESKTOP = 4;

export default function LatestNewsSection({
  variant = "trending",
  limit = 6,
}: {
  variant?: "trending" | "latest";
  limit?: number;
}) {
  const { data: items = [] } = useQuery<NewsItem[]>({
    queryKey: ["v3-home-news", variant, limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("roxou_news")
        .select("id,slug,title,cover_image_url,category,published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(limit);
      return (data || [])
        .filter((n: any) => n.published_at)
        .map((n: any) => ({ ...n, source: "roxou" as const }));
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!items.length) return null;

  const isTrending = variant === "trending";
  const title = isTrending ? "🔥 Agora em Prudente" : "📰 Últimas notícias";
  const subtitle = isTrending
    ? "Notícias, rumores e assuntos que estão movimentando a cidade"
    : "Cobertura completa Roxou";

  const renderCard = (n: NewsItem, sizing: string) => {
    const href = `/noticia/${n.slug}`;
    const dateLabel = n.published_at ? format(new Date(n.published_at), "d MMM", { locale: ptBR }) : null;
    return (
      <Link
        key={`${n.source}-${n.id}`}
        to={href}
        className={`block rounded-2xl overflow-hidden bg-card border border-border/40 hover:border-primary/40 transition-all group ${sizing}`}
      >
        <div className="relative aspect-video bg-secondary overflow-hidden rounded-xl">
          <SmartImage
            src={n.cover_image_url}
            alt={n.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            {isTrending && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/90 text-[9px] font-extrabold text-accent-foreground uppercase tracking-wider">
                <Flame className="w-2.5 h-2.5" /> Em alta
              </span>
            )}
          </div>
        </div>
        <div className="p-3 space-y-1.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary/80">{n.category}</span>
          <h3 className="font-display font-bold text-sm text-foreground line-clamp-2 leading-tight">{n.title}</h3>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Newspaper className="w-3 h-3" />
            {dateLabel && <span>{dateLabel}</span>}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <section className="pt-6 pb-2">
      <div className="flex items-center justify-between px-4 mb-4">
        <div>
          <h2 className="font-display font-extrabold text-lg text-foreground uppercase tracking-wide">{title}</h2>
          <p className="text-[10px] text-muted-foreground -mt-0.5">{subtitle}</p>
        </div>
        <Link
          to="/noticias"
          className="text-[11px] font-semibold text-primary flex items-center gap-0.5 hover:underline"
        >
          Ver todas <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Mobile/tablet: scroll horizontal nativo, 1 card por vez no mobile / 2 no tablet */}
      <div className="lg:hidden w-full max-w-full flex gap-4 overflow-x-auto overflow-y-hidden pb-2 scrollbar-hide snap-x snap-mandatory pl-4 pr-4">
        {items.map((n) =>
          renderCard(
            n,
            "w-[85vw] max-w-[360px] md:w-[calc(50%-0.5rem)] snap-start shrink-0"
          )
        )}
      </div>

      {/* Desktop: grid responsivo, 3 cards em lg e 4 em xl */}
      <div className="hidden lg:grid grid-cols-3 xl:grid-cols-4 gap-4 px-4">
        {items.slice(0, MAX_DESKTOP).map((n) => renderCard(n, "w-full"))}
      </div>
    </section>
  );
}
