import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, User, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import SafeHtml from "@/components/SafeHtml";

interface News {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  author: string;
  category: string;
  published_at: string | null;
  source_url?: string | null;
}

interface RelatedNews {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string;
  published_at: string | null;
}

const RoxouNoticia = () => {
  const { slug } = useParams<{ slug: string }>();
  const [news, setNews] = useState<News | null>(null);
  const [related, setRelated] = useState<RelatedNews[]>([]);
  const [popular, setPopular] = useState<RelatedNews[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      setLoading(true);
      const { data } = await supabase
        .from("roxou_news")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      setNews(data as News | null);

      if (data) {
        // Track view
        supabase.from("page_views").insert({ page_path: `/noticia/${slug}` }).then(() => {});

        // Related (same category)
        const { data: rel } = await supabase
          .from("roxou_news")
          .select("id,title,slug,excerpt,cover_image_url,category,published_at")
          .eq("status", "published")
          .eq("category", data.category)
          .neq("id", data.id)
          .order("published_at", { ascending: false })
          .limit(4);
        setRelated((rel ?? []) as RelatedNews[]);

        // Popular: most viewed in last 30d (by page_views joining roxou_news slugs)
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: views } = await supabase
          .from("page_views")
          .select("page_path")
          .ilike("page_path", "/noticia/%")
          .gte("created_at", since)
          .limit(1000);

        const counts: Record<string, number> = {};
        (views ?? []).forEach((v: any) => {
          const s = v.page_path.replace("/noticia/", "");
          if (s && s !== slug) counts[s] = (counts[s] ?? 0) + 1;
        });
        const topSlugs = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([s]) => s);

        if (topSlugs.length > 0) {
          const { data: pop } = await supabase
            .from("roxou_news")
            .select("id,title,slug,excerpt,cover_image_url,category,published_at")
            .eq("status", "published")
            .in("slug", topSlugs);
          // mantém a ordem de popularidade
          const ordered = topSlugs
            .map((s) => (pop ?? []).find((p: any) => p.slug === s))
            .filter(Boolean) as RelatedNews[];
          setPopular(ordered.slice(0, 4));
        } else {
          // Fallback: últimas notícias
          const { data: latest } = await supabase
            .from("roxou_news")
            .select("id,title,slug,excerpt,cover_image_url,category,published_at")
            .eq("status", "published")
            .neq("id", data.id)
            .order("published_at", { ascending: false })
            .limit(4);
          setPopular((latest ?? []) as RelatedNews[]);
        }
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>;
  }

  if (!news) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-muted-foreground">Notícia não encontrada.</p>
        <Link to="/noticias" className="text-primary text-sm font-semibold underline">Voltar para notícias</Link>
      </div>
    );
  }

  const RelatedCard = ({ n }: { n: RelatedNews }) => (
    <Link
      to={`/noticia/${n.slug}`}
      className="group block rounded-2xl border border-white/10 bg-card/50 overflow-hidden hover:border-primary/40 hover:bg-card/70 transition"
    >
      {n.cover_image_url ? (
        <div className="aspect-[16/10] overflow-hidden bg-black/30">
          <img src={n.cover_image_url} alt={n.title} className="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" />
        </div>
      ) : (
        <div className="aspect-[16/10] bg-gradient-to-br from-primary/20 to-purple-500/10" />
      )}
      <div className="p-3">
        <span className="inline-block text-[9px] font-bold uppercase tracking-widest text-primary">{n.category}</span>
        <h3 className="mt-1 font-display font-bold text-sm leading-tight line-clamp-3 group-hover:text-primary transition">{n.title}</h3>
        {n.published_at && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            {new Date(n.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </p>
        )}
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title={`${news.title} — Roxou`}
        description={news.excerpt ?? news.title}
        canonical={`https://roxou.com.br/noticia/${news.slug}`}
        ogImage={news.cover_image_url ?? undefined}
        ogType="article"
      />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl flex items-center gap-3 px-4 h-14">
          <Link to="/noticias" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-display font-black text-sm tracking-tight">
            ROXOU <span className="text-primary">NOTÍCIAS</span>
          </span>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-8">
        <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-primary">
          {news.category}
        </span>
        <h1 className="mt-2 font-display text-3xl sm:text-5xl font-black leading-tight tracking-tight">
          {news.title}
        </h1>
        {news.excerpt && <p className="mt-3 text-lg text-muted-foreground">{news.excerpt}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-y border-white/10 py-3">
          <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4 text-primary" /> <span className="text-foreground font-bold">{news.author}</span></span>
          {news.published_at && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              {new Date(news.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </span>
          )}
        </div>

        {news.cover_image_url && (
          <img src={news.cover_image_url} alt={news.title} className="mt-6 w-full rounded-2xl border border-white/10" />
        )}

        <div className="mt-8 prose prose-invert max-w-none">
          <SafeHtml html={news.content} className="text-base leading-relaxed text-foreground/90 space-y-4" />
        </div>

        {news.source_url && (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm">
            <span className="text-muted-foreground">Fonte: </span>
            <a
              href={news.source_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-primary hover:underline break-all"
            >
              {news.source_url}
            </a>
          </div>
        )}

        <div className="mt-12 rounded-2xl border border-white/10 bg-card/50 p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Reportagem por</div>
            <div className="font-bold">{news.author}</div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-xl sm:text-2xl font-black tracking-tight mb-4">
              Notícias relacionadas
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {related.map((n) => <RelatedCard key={n.id} n={n} />)}
            </div>
          </section>
        )}

        {/* Popular */}
        {popular.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-xl sm:text-2xl font-black tracking-tight mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Mais lidas no Roxou
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {popular.map((n) => <RelatedCard key={n.id} n={n} />)}
            </div>
          </section>
        )}

        <div className="mt-16 text-center">
          <Link
            to="/noticias"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90"
          >
            Ver todas as notícias da Roxou
          </Link>
        </div>
      </article>
    </div>
  );
};

export default RoxouNoticia;
