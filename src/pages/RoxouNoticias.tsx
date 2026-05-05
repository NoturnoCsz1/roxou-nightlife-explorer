import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";

interface Item {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string;
  published_at: string | null;
  author: string;
}

const CATEGORIES = [
  { value: "all", label: "Todas" },
  { value: "bares", label: "Bares" },
  { value: "festas", label: "Festas" },
  { value: "baladas", label: "Baladas" },
  { value: "restaurantes", label: "Restaurantes" },
  { value: "shows", label: "Shows" },
  { value: "gastronomia", label: "Gastronomia" },
  { value: "cultura", label: "Cultura" },
];

const RoxouNoticias = () => {
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<string>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase
        .from("roxou_news")
        .select("id,title,slug,excerpt,cover_image_url,category,published_at,author")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(60);
      if (cat !== "all") q = q.eq("category", cat);
      const { data } = await q;
      setRows((data ?? []) as Item[]);
      setLoading(false);
    })();
  }, [cat]);

  const featured = rows[0];
  const rest = rows.slice(1);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Notícias Roxou — Bares, festas, baladas, restaurantes e shows em Presidente Prudente"
        description="Notícias de bares, festas, baladas, restaurantes e shows em Presidente Prudente. Tudo sobre a vida noturna do interior de SP no Roxou."
        canonical="https://roxou.com.br/noticias"
      />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex items-center gap-3 px-4 h-14">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-display font-black text-sm tracking-tight">
            ROXOU <span className="text-primary">NOTÍCIAS</span>
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tight">
            Notícias da <span className="text-primary">Roxou</span>
          </h1>
          <p className="mt-2 text-muted-foreground text-sm sm:text-base">
            Bares, festas, baladas, restaurantes e shows em Presidente Prudente.
          </p>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none mb-6">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCat(c.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                cat === c.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-white/10 text-muted-foreground hover:text-foreground hover:border-white/30"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-muted-foreground">
            Nenhuma notícia publicada ainda nessa categoria.
          </div>
        ) : (
          <>
            {/* Destaque */}
            {featured && (
              <Link
                to={`/noticia/${featured.slug}`}
                className="group block rounded-3xl border border-white/10 bg-card/50 overflow-hidden hover:border-primary/40 transition mb-8"
              >
                <div className="grid md:grid-cols-2 gap-0">
                  {featured.cover_image_url ? (
                    <div className="aspect-[16/10] md:aspect-auto md:h-full overflow-hidden bg-black/30">
                      <img src={featured.cover_image_url} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    </div>
                  ) : (
                    <div className="aspect-[16/10] md:aspect-auto bg-gradient-to-br from-primary/30 to-purple-500/10" />
                  )}
                  <div className="p-6 sm:p-8 flex flex-col justify-center">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-primary">
                      {featured.category}
                    </span>
                    <h2 className="mt-2 font-display text-2xl sm:text-3xl font-black leading-tight group-hover:text-primary transition">
                      {featured.title}
                    </h2>
                    {featured.excerpt && (
                      <p className="mt-3 text-muted-foreground line-clamp-3">{featured.excerpt}</p>
                    )}
                    <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{featured.author}</span>
                      {featured.published_at && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-primary" />
                          {new Date(featured.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Lista */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map((n) => (
                <Link
                  key={n.id}
                  to={`/noticia/${n.slug}`}
                  className="group block rounded-2xl border border-white/10 bg-card/50 overflow-hidden hover:border-primary/40 transition"
                >
                  {n.cover_image_url ? (
                    <div className="aspect-[16/10] overflow-hidden bg-black/30">
                      <img src={n.cover_image_url} alt={n.title} className="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" />
                    </div>
                  ) : (
                    <div className="aspect-[16/10] bg-gradient-to-br from-primary/20 to-purple-500/10" />
                  )}
                  <div className="p-4">
                    <span className="inline-block text-[9px] font-bold uppercase tracking-widest text-primary">{n.category}</span>
                    <h3 className="mt-1 font-display font-bold text-base leading-tight line-clamp-3 group-hover:text-primary transition">{n.title}</h3>
                    {n.excerpt && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{n.excerpt}</p>}
                    {n.published_at && (
                      <p className="mt-3 text-[10px] text-muted-foreground">
                        {new Date(n.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RoxouNoticias;
