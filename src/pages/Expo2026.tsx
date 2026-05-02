import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Music, Newspaper, Ticket, Car, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import SafeHtml from "@/components/SafeHtml";

interface ExpoNews {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  author: string;
  category: string;
  published_at: string | null;
}

const CATEGORIES = [
  { value: "all", label: "Todas" },
  { value: "shows", label: "Shows" },
  { value: "rodeio", label: "Rodeio" },
  { value: "gastronomia", label: "Gastronomia" },
  { value: "avisos", label: "Avisos" },
  { value: "geral", label: "Geral" },
];

function useExpoCountdown() {
  const target = useMemo(() => new Date("2026-09-10T20:00:00-03:00").getTime(), []);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target - now);
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

const Expo2026 = () => {
  const countdown = useExpoCountdown();
  const [news, setNews] = useState<ExpoNews[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("expo_news")
        .select("id,title,slug,excerpt,cover_image_url,author,category,published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(30);
      setNews((data ?? []) as ExpoNews[]);
      setLoading(false);
    })();
  }, []);

  const filtered = filter === "all" ? news : news.filter((n) => n.category === filter);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <SEO
        title="Expo Prudente 2026 — O Maior Rolê do Oeste | ROXOU"
        description="Tudo da Expo Prudente 2026: shows, rodeio, gastronomia, ingressos e caronas. Cobertura oficial ROXOU."
        canonical="https://roxou.com.br/expo2026"
      />

      {/* Glow ambient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[40vw] h-[40vh] bg-accent/10 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-14">
          <Link to="/expo2026" className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-display font-black tracking-tight">EXPO PRUDENTE <span className="text-primary">2026</span></span>
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">by ROXOU</span>
        </div>
      </header>

      {/* HERO */}
      <section className="px-4 pt-10 pb-8 mx-auto max-w-6xl">
        <div className="text-center">
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Hot site oficial
          </span>
          <h1 className="mt-4 font-display text-4xl sm:text-6xl md:text-7xl font-black leading-[0.95] tracking-tight">
            O ROLÊ DO ANO <br />
            <span className="bg-gradient-to-r from-primary via-fuchsia-400 to-accent bg-clip-text text-transparent">
              ESTÁ CHEGANDO.
            </span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Shows nacionais, rodeio profissional, gastronomia e o maior ponto de encontro de Presidente Prudente.
            Toda a cobertura, em tempo real, aqui.
          </p>
          <div className="mt-5 flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4 text-primary" /> 10 a 20 SET 2026</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> Recinto Expo Prudente</span>
          </div>

          {/* Countdown */}
          <div className="mt-8 grid grid-cols-4 gap-2 sm:gap-3 max-w-xl mx-auto">
            {[
              { v: countdown.days, l: "dias" },
              { v: countdown.hours, l: "horas" },
              { v: countdown.minutes, l: "min" },
              { v: countdown.seconds, l: "seg" },
            ].map((b) => (
              <div key={b.l} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md py-4 shadow-[0_0_30px_-10px_hsl(var(--primary)/0.5)]">
                <div className="text-3xl sm:text-4xl font-black text-primary tabular-nums">{String(b.v).padStart(2, "0")}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{b.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="px-4 mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Music, label: "Shows", href: "#shows" },
            { icon: Ticket, label: "Ingressos", href: "#ingressos" },
            { icon: Car, label: "Caronas", href: "#transporte" },
            { icon: Newspaper, label: "Notícias", href: "#noticias" },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="group rounded-xl border border-white/10 bg-card/50 hover:bg-card/80 hover:border-primary/40 backdrop-blur-md p-4 transition-all hover:-translate-y-0.5"
            >
              <l.icon className="h-5 w-5 text-primary mb-2 group-hover:drop-shadow-[0_0_8px_hsl(var(--primary))]" />
              <div className="text-sm font-bold">{l.label}</div>
            </a>
          ))}
        </div>
      </section>

      {/* NOTÍCIAS */}
      <section id="noticias" className="px-4 mx-auto max-w-6xl mt-14">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-black">Últimas notícias</h2>
            <p className="text-sm text-muted-foreground">Cobertura oficial direto do recinto.</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition ${
                filter === c.value
                  ? "bg-primary text-primary-foreground border-primary shadow-[0_0_20px_-5px_hsl(var(--primary))]"
                  : "border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-72 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-muted-foreground">
            Nenhuma notícia publicada ainda. Volte em breve.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {filtered.map((n) => (
              <Link
                key={n.id}
                to={`/expo2026/noticia/${n.slug}`}
                className="group rounded-2xl overflow-hidden border border-white/10 bg-card/50 backdrop-blur-md hover:border-primary/40 hover:-translate-y-0.5 transition-all"
              >
                {n.cover_image_url ? (
                  <div className="aspect-[16/10] overflow-hidden">
                    <img src={n.cover_image_url} alt={n.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                ) : (
                  <div className="aspect-[16/10] bg-gradient-to-br from-primary/30 to-accent/20" />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary font-bold">
                    <span>{n.category}</span>
                    {n.published_at && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">
                          {new Date(n.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="mt-2 font-bold leading-tight group-hover:text-primary transition">{n.title}</h3>
                  {n.excerpt && <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{n.excerpt}</p>}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">por <span className="text-foreground font-semibold">{n.author}</span></span>
                    <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* SHOWS placeholder */}
      <section id="shows" className="px-4 mx-auto max-w-6xl mt-16">
        <h2 className="font-display text-2xl sm:text-3xl font-black mb-4">Programação de shows</h2>
        <div className="rounded-2xl border border-white/10 bg-card/50 backdrop-blur-md p-8 text-center">
          <Music className="h-8 w-8 text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Line-up completo em breve. Acompanhe pelas notícias acima.</p>
        </div>
      </section>

      {/* INGRESSOS / TRANSPORTE */}
      <section id="ingressos" className="px-4 mx-auto max-w-6xl mt-10 grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-card/50 backdrop-blur-md p-6">
          <Ticket className="h-6 w-6 text-primary mb-2" />
          <h3 className="font-bold text-lg">Ingressos</h3>
          <p className="text-sm text-muted-foreground mt-1">Vendas oficiais com link direto liberadas em breve aqui.</p>
        </div>
        <div id="transporte" className="rounded-2xl border border-white/10 bg-card/50 backdrop-blur-md p-6">
          <Car className="h-6 w-6 text-primary mb-2" />
          <h3 className="font-bold text-lg">Caronas e transporte</h3>
          <p className="text-sm text-muted-foreground mt-1">Sistema "Como você vai?" da ROXOU vai conectar passageiros e motoristas durante toda a Expo.</p>
        </div>
      </section>

      <footer className="mt-20 border-t border-white/10 py-8 text-center text-xs text-muted-foreground">
        Hot site oficial · ROXOU © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default Expo2026;
