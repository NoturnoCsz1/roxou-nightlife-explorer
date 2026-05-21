import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Music, Newspaper, Ticket, Car, ArrowRight, Sparkles, Star, Flame, CheckCircle2, Instagram, Twitter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import ExpoFAQ, { faqJsonLd, DEFAULT_EXPO_FAQ } from "@/components/expo/ExpoFAQ";
import ExpoGallery from "@/components/expo/ExpoGallery";

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

const ATTRACTIONS = [
  {
    name: "Gusttavo Lima",
    date: "Data a confirmar",
    tag: "Sertanejo",
    image:
      "https://gusttavolima.com.br/wp-content/uploads/2025/08/R5C15611-2.png",
    position: "center 20%",
  },
  {
    name: "Zezé Di Camargo & Luciano",
    date: "Data a confirmar",
    tag: "Sertanejo Raiz",
    image:
      "https://midias.correiobraziliense.com.br/_midias/jpg/2023/03/19/675x450/1_zeze_di_camargo_e_luciano_1024x768-27646392.jpg",
    position: "center 30%",
  },
  {
    name: "Leonardo",
    date: "Data a confirmar",
    tag: "Sertanejo Raiz",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Leonardo_%28cantor%29.jpg/960px-Leonardo_%28cantor%29.jpg",
    position: "center 25%",
  },
  {
    name: "Zé Neto & Cristiano",
    date: "13/09/2026",
    tag: "Sertanejo",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/5/55/Z%C3%A9_Neto_%26_Cristiano_2017_ZN%26C.png",
    position: "center 20%",
  },
];

const TBA_DATES = [
  { date: "12/09/2026", label: "Sábado" },
  { date: "13/09/2026", label: "Domingo" },
  { date: "14/09/2026", label: "Segunda" },
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
    <div className="min-h-screen bg-[#0a0612] text-foreground relative overflow-hidden">
      <SEO
        title="Expo Prudente 2026 — Shows, Programação e Ingressos | ROXOU"
        description="Tudo da Expo Prudente 2026 em Presidente Prudente: shows confirmados, programação, ingressos, rodeio e caronas. Cobertura oficial ROXOU."
        canonical="https://roxou.com.br/expo2026"
        keywords="expo prudente 2026, shows prudente, eventos hoje em presidente prudente, o que fazer em prudente, expo presidente prudente"
        jsonLd={faqJsonLd(DEFAULT_EXPO_FAQ)}
      />

      {/* Glow ambient — roxo + laranja */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[90vw] h-[60vh] bg-primary/25 rounded-full blur-[120px]" />
        <div className="absolute top-[30vh] -right-20 w-[50vw] h-[50vh] bg-orange-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-[60vh] -left-20 w-[50vw] h-[50vh] bg-yellow-500/15 rounded-full blur-[120px]" />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0612]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-14">
          <Link to="/expo2026" className="flex items-center gap-2">
            <div className="relative">
              <Sparkles className="h-5 w-5 text-orange-400" />
              <div className="absolute inset-0 blur-md bg-orange-400/50 -z-10" />
            </div>
            <span className="font-display font-black tracking-tight text-sm sm:text-base">
              EXPO PRUDENTE{" "}
              <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">2026</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="text-[10px] sm:text-xs font-semibold text-muted-foreground hover:text-primary transition flex items-center gap-1"
            >
              <span className="text-primary">●</span> ROXOU
            </Link>
            <a
              href="https://www.instagram.com/roxou.pp/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram @roxou.pp"
              className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-white/5 transition"
            >
              <Instagram className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://x.com/roxou_pp"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter @roxou_pp"
              className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-white/5 transition"
            >
              <Twitter className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative px-4 pt-12 pb-12 mx-auto max-w-6xl">
        <div className="group relative rounded-3xl overflow-hidden border border-white/10 p-6 sm:p-12">
          {/* Background image with parallax */}
          <div
            className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[1200ms] ease-out group-hover:scale-105 motion-safe:animate-[fade-in_1s_ease-out]"
            style={{
              backgroundImage: 'url("/expo2026/hero-bg.jpg")',
            }}
            aria-hidden="true"
          />
          {/* Dark overlay for readability */}
          <div
            className="absolute inset-0 z-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(9,9,11,0.55), rgba(9,9,11,0.85))",
            }}
            aria-hidden="true"
          />
          {/* Roxou identity glows */}
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at left, rgba(168,85,247,0.35), transparent 60%), radial-gradient(circle at right, rgba(255,140,0,0.25), transparent 60%)",
            }}
            aria-hidden="true"
          />
          {/* Decorative bg accents */}
          <div className="absolute -top-10 -right-10 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 text-center">

            <h1 className="sr-only">Expo Prudente 2026</h1>
            <img
              src="/expo2026/logo-expo.png"
              alt="Expo Prudente 2026"
              width={320}
              height={200}
              className="mx-auto w-[220px] sm:w-[320px] h-auto drop-shadow-[0_0_40px_rgba(251,146,60,0.45)]"
            />

            <p className="mt-5 text-lg sm:text-2xl text-white max-w-2xl mx-auto font-bold drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              As atrações divulgadas já estão aqui.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-sm">
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/60 border border-orange-400/40 backdrop-blur-md shadow-[0_0_25px_-5px_rgba(251,146,60,0.5)]">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
                <span className="font-bold text-white text-sm sm:text-base tracking-wide">10 a 14 SET 2026</span>
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/60 border border-orange-400/40 backdrop-blur-md shadow-[0_0_25px_-5px_rgba(251,146,60,0.5)]">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
                <span className="font-bold text-white text-sm sm:text-base tracking-wide">Recinto de Exposições Jacob Tosello</span>
              </span>
            </div>

            {/* CTA */}
            <a
              href="#atracoes"
              className="mt-7 inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm sm:text-base text-black bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 shadow-[0_0_40px_-5px_rgba(251,146,60,0.7)] hover:shadow-[0_0_50px_-2px_rgba(251,146,60,0.9)] hover:scale-105 transition-all"
            >
              <Star className="h-4 w-4 fill-black" />
              Ver atrações confirmadas
              <ArrowRight className="h-4 w-4" />
            </a>

            {/* Countdown */}
            <div className="mt-9 grid grid-cols-4 gap-2 sm:gap-3 max-w-xl mx-auto">
              {[
                { v: countdown.days, l: "dias" },
                { v: countdown.hours, l: "horas" },
                { v: countdown.minutes, l: "min" },
                { v: countdown.seconds, l: "seg" },
              ].map((b) => (
                <div
                  key={b.l}
                  className="rounded-2xl border border-orange-400/20 bg-black/40 backdrop-blur-md py-3 sm:py-4 shadow-[0_0_30px_-15px_rgba(251,146,60,0.6)]"
                >
                  <div className="text-2xl sm:text-4xl font-black tabular-nums bg-gradient-to-b from-orange-300 to-orange-500 bg-clip-text text-transparent">
                    {String(b.v).padStart(2, "0")}
                  </div>
                  <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                    {b.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SUB-PÁGINAS / NAV INTERNA SEO */}
      <nav aria-label="Seções da Expo" className="px-4 mx-auto max-w-6xl -mt-2">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Link to="/expo2026/shows" className="rounded-2xl border border-orange-400/20 bg-white/5 hover:bg-orange-500/10 hover:border-orange-400/50 backdrop-blur-md p-4 text-center transition">
            <Music className="h-5 w-5 mx-auto text-orange-400" />
            <div className="mt-1 text-xs sm:text-sm font-bold">🔥 Shows</div>
            <div className="hidden sm:block text-[11px] text-muted-foreground">Atrações confirmadas</div>
          </Link>
          <Link to="/expo2026/programacao" className="rounded-2xl border border-yellow-400/20 bg-white/5 hover:bg-yellow-500/10 hover:border-yellow-400/50 backdrop-blur-md p-4 text-center transition">
            <Calendar className="h-5 w-5 mx-auto text-yellow-400" />
            <div className="mt-1 text-xs sm:text-sm font-bold">📅 Programação</div>
            <div className="hidden sm:block text-[11px] text-muted-foreground">Dia a dia da Expo</div>
          </Link>
          <Link to="/expo2026/ingressos" className="rounded-2xl border border-primary/30 bg-white/5 hover:bg-primary/10 hover:border-primary/60 backdrop-blur-md p-4 text-center transition">
            <Ticket className="h-5 w-5 mx-auto text-primary" />
            <div className="mt-1 text-xs sm:text-sm font-bold">🎟️ Ingressos</div>
            <div className="hidden sm:block text-[11px] text-muted-foreground">Onde comprar</div>
          </Link>
        </div>
      </nav>

      <section id="atracoes" className="px-4 mx-auto max-w-6xl mt-6">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-300">
                Line-up oficial
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-black">
              Atrações <span className="text-orange-400">confirmadas</span>
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ATTRACTIONS.map((a) => (
            <div
              key={a.name}
              className="group relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md hover:border-orange-400/40 hover:-translate-y-0.5 transition-all"
            >
              <div className="aspect-[16/10] relative overflow-hidden">
                <img
                  src={a.image}
                  alt={a.name}
                  style={{ objectPosition: a.position }}
                  className="w-full h-full object-cover scale-[1.03] group-hover:scale-[1.08] transition-transform duration-700"
                  loading="lazy"
                />
                {/* Overlay base para legibilidade */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(9,9,11,0.88) 0%, rgba(9,9,11,0.45) 40%, rgba(9,9,11,0.1) 100%)",
                  }}
                />
                {/* Light leak no topo (estilo show) */}
                <div
                  className="absolute inset-x-0 top-0 h-1/2 pointer-events-none mix-blend-screen opacity-70"
                  style={{
                    background:
                      "radial-gradient(ellipse at 30% 0%, rgba(168,85,247,0.45), transparent 55%), radial-gradient(ellipse at 75% 0%, rgba(255,140,0,0.35), transparent 60%)",
                  }}
                />
                {/* Vinheta nas bordas */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    boxShadow: "inset 0 0 80px 20px rgba(0,0,0,0.55)",
                  }}
                />
                <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/20 border border-green-400/40 backdrop-blur-md">
                  <CheckCircle2 className="h-3 w-3 text-green-300" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-green-300">
                    Confirmado
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">
                    {a.tag}
                  </span>
                  <h3 className="font-display font-black text-2xl sm:text-3xl text-white leading-tight mt-1">
                    {a.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-2 text-white/70 text-xs">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{a.date}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Datas a confirmar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          {TBA_DATES.map((t) => (
            <div
              key={t.date}
              className="relative rounded-2xl overflow-hidden border border-dashed border-orange-400/30 bg-gradient-to-br from-white/5 to-orange-500/5 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center min-h-[180px] hover:border-orange-400/60 transition-all"
            >
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-400/30 mb-3">
                <Sparkles className="h-3 w-3 text-yellow-300" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-300">
                  Em breve
                </span>
              </span>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">
                {t.label}
              </div>
              <div className="font-display font-black text-2xl sm:text-3xl text-white mt-1">
                {t.date}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-white/60 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                <span>Atrações a confirmar</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NOTÍCIAS */}
      <section id="noticias" className="px-4 mx-auto max-w-6xl mt-16">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <Newspaper className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                Cobertura ROXOU
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-black">
              Últimas <span className="text-primary">notícias</span>
            </h2>
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
                  ? "bg-gradient-to-r from-orange-500 to-orange-400 text-black border-transparent shadow-[0_0_20px_-5px_rgba(251,146,60,0.7)]"
                  : "border-white/10 text-muted-foreground hover:text-foreground hover:border-orange-400/30"
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
                className="group rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md hover:border-orange-400/40 hover:-translate-y-0.5 transition-all"
              >
                {n.cover_image_url ? (
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={n.cover_image_url}
                      alt={n.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/10] bg-gradient-to-br from-primary/30 via-orange-500/20 to-yellow-500/10" />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-orange-300 font-bold">
                    <span>{n.category}</span>
                    {n.published_at && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">
                          {new Date(n.published_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="mt-2 font-bold leading-tight group-hover:text-orange-300 transition">
                    {n.title}
                  </h3>
                  {n.excerpt && (
                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{n.excerpt}</p>
                  )}
                  <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-orange-300 group-hover:gap-2.5 transition-all">
                    Ler notícia <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* GALERIA PREMIUM — Álbuns por artista */}
      <ExpoGallery />


      {/* INGRESSOS / TRANSPORTE */}
      <section id="ingressos" className="px-4 mx-auto max-w-6xl mt-16 grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-orange-400/20 bg-gradient-to-br from-orange-500/10 to-transparent backdrop-blur-md p-6">
          <Ticket className="h-7 w-7 text-orange-400 mb-3" />
          <h3 className="font-display font-black text-xl">Ingressos</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Vendas oficiais com link direto liberadas em breve aqui.
          </p>
        </div>
        <a
          id="transporte"
          href="https://roxou.com.br/pedir-carona"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent backdrop-blur-md p-6 hover:border-primary/60 hover:-translate-y-0.5 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.5)] transition-all"
        >
          <Car className="h-7 w-7 text-primary mb-3" />
          <h3 className="font-display font-black text-xl">Caronas e transporte</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Sistema "Como você vai?" da ROXOU vai conectar passageiros e motoristas durante toda a Expo.
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary">
            Pedir carona <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </a>
      </section>

      {/* FAQ SEO */}
      <ExpoFAQ />

      {/* SEO local — texto rico para indexação */}
      <section className="sr-only" aria-hidden="true">
        <h2>Eventos em Presidente Prudente e Expo Prudente 2026</h2>
        <p>
          A Expo Prudente 2026 é o maior evento de Presidente Prudente e do Oeste Paulista. Aqui na
          ROXOU você encontra a agenda de shows em Prudente, eventos hoje em Presidente Prudente,
          o que fazer em Prudente, baladas, bares, rodeio, gastronomia e ingressos. Cobertura
          oficial e atualizada diariamente.
        </p>
        <p>
          Pesquise por: expo prudente 2026, shows prudente, programação expo prudente, ingressos
          expo prudente, eventos em presidente prudente, agenda de shows em prudente.
        </p>
      </section>

      <footer className="mt-20 border-t border-white/10 py-10 text-center">
        <div className="mx-auto max-w-3xl px-4 grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-orange-300 font-bold mb-2">
              Realização
            </div>
            <div className="text-sm font-semibold text-white/90 leading-relaxed">
              Fabio Nascimento <span className="text-muted-foreground">·</span> Prudente em Foco{" "}
              <span className="text-muted-foreground">·</span> KDS Produções e Eventos
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold mb-2">
              Apoio
            </div>
            <div className="text-sm font-semibold text-white/90 leading-relaxed">
              Prefeitura de Presidente Prudente
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Hot site oficial · <span className="text-primary font-bold">ROXOU</span> ×{" "}
          <span className="text-orange-400 font-bold">Expo Prudente 2026</span>
        </div>
        <div className="text-[10px] text-muted-foreground/60 mt-1">© {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
};

export default Expo2026;
