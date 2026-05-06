import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Newspaper, Flame, ChevronRight, ChevronLeft } from "lucide-react";
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

const PER_PAGE_DESKTOP = 3;

export default function LatestNewsSection({
  variant = "trending",
  limit = 6,
}: {
  variant?: "trending" | "latest";
  limit?: number;
}) {
  const [page, setPage] = useState(0);

  const { data: items = [] } = useQuery<NewsItem[]>({
    queryKey: ["v3-home-news", variant, limit],
    queryFn: async () => {
      const [roxou, expo] = await Promise.all([
        supabase
          .from("roxou_news")
          .select("id,slug,title,cover_image_url,category,published_at")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(limit),
        supabase
          .from("expo_news")
          .select("id,slug,title,cover_image_url,category,published_at")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(limit),
      ]);
      const r: NewsItem[] = (roxou.data || []).map((n: any) => ({ ...n, source: "roxou" }));
      const e: NewsItem[] = (expo.data || []).map((n: any) => ({ ...n, source: "expo" }));
      const merged = [...r, ...e]
        .filter((n) => n.published_at)
        .sort((a, b) => new Date(b.published_at!).getTime() - new Date(a.published_at!).getTime());
      return merged.slice(0, limit);
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!items.length) return null;

  const isTrending = variant === "trending";
  const title = isTrending ? "🔥 Agora em Prudente" : "📰 Últimas notícias";
  const subtitle = isTrending
    ? "Notícias, rumores e assuntos que estão movimentando a cidade"
    : "Cobertura completa Roxou";

  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE_DESKTOP));
  const safePage = Math.min(page, totalPages - 1);
  const desktopSlice = items.slice(safePage * PER_PAGE_DESKTOP, safePage * PER_PAGE_DESKTOP + PER_PAGE_DESKTOP);
  const canPaginate = items.length > PER_PAGE_DESKTOP;

  const renderCard = (n: NewsItem, sizing: string) => {
    const href = n.source === "expo" ? `/expo2026/noticia/${n.slug}` : `/noticia/${n.slug}`;
    const dateLabel = n.published_at ? format(new Date(n.published_at), "d MMM", { locale: ptBR }) : null;
    return (
      <Link
        key={`${n.source}-${n.id}`}
        to={href}
        className={`${sizing} rounded-2xl overflow-hidden bg-card border border-border/40 hover:border-primary/40 transition-all group`}
      >
        <div className="relative aspect-[16/10] bg-secondary overflow-hidden">
          <SmartImage
            src={n.cover_image_url}
            alt={n.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            {n.source === "expo" && (
              <span className="px-2 py-0.5 rounded-full bg-primary/90 text-[9px] font-extrabold text-primary-foreground uppercase tracking-wider backdrop-blur-sm">
                🎡 Expo 2026
              </span>
            )}
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
    <section className="px-4 pt-6 pb-2">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="font-display font-extrabold text-lg text-foreground uppercase tracking-wide">{title}</h2>
          <p className="text-[10px] text-muted-foreground -mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {canPaginate && (
            <div className="hidden lg:flex items-center gap-1.5">
              <button
                aria-label="Anterior"
                onClick={() => setPage((p) => (p - 1 + totalPages) % totalPages)}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-border/40 bg-background/40 backdrop-blur-md hover:border-primary/50 hover:text-primary transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                aria-label="Próxima"
                onClick={() => setPage((p) => (p + 1) % totalPages)}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-border/40 bg-background/40 backdrop-blur-md hover:border-primary/50 hover:text-primary transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          <Link
            to="/noticias"
            className="text-[11px] font-semibold text-primary flex items-center gap-0.5 hover:underline"
          >
            Ver todas <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Mobile/tablet: scroll horizontal nativo */}
      <div className="lg:hidden w-full max-w-full flex gap-3 overflow-x-auto overflow-y-visible pb-2 scrollbar-hide snap-x snap-mandatory">
        {items.map((n) => renderCard(n, "snap-start shrink-0 w-[78%] sm:w-[58%] md:w-[42%]"))}
      </div>

      {/* Desktop: paginado, 3 cards por página, sem corte */}
      <div className="hidden lg:grid grid-cols-3 gap-4">
        {desktopSlice.map((n) => renderCard(n, "w-full"))}
        {/* placeholders invisíveis para manter grid estável quando última página tem menos de 3 */}
        {desktopSlice.length < PER_PAGE_DESKTOP &&
          Array.from({ length: PER_PAGE_DESKTOP - desktopSlice.length }).map((_, i) => (
            <div key={`ph-${i}`} className="invisible" aria-hidden />
          ))}
      </div>
    </section>
  );
}
