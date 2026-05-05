import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, User } from "lucide-react";
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

const ExpoNoticia = () => {
  const { slug } = useParams<{ slug: string }>();
  const [news, setNews] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      const { data } = await supabase
        .from("expo_news")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      setNews(data as News | null);
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
        <Link to="/expo2026" className="text-primary text-sm font-semibold underline">Voltar para o hot site</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title={`${news.title} — Expo Prudente 2026`}
        description={news.excerpt ?? news.title}
        canonical={`https://roxou.com.br/expo2026/noticia/${news.slug}`}
        ogImage={news.cover_image_url ?? undefined}
        ogType="article"
      />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl flex items-center gap-3 px-4 h-14">
          <Link to="/expo2026" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-display font-black text-sm tracking-tight">EXPO PRUDENTE <span className="text-primary">2026</span></span>
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
      </article>
    </div>
  );
};

export default ExpoNoticia;
