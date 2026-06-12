import { FormEvent, memo, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Loader2, Send, Sparkles, User, MapPin, Car, Video, Beer, Music, Calendar, Trophy, Navigation } from "lucide-react";
import AuraAvatar from "@/components/v3/AuraAvatar";
import SEO from "@/components/SEO";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useV3Profile } from "@/hooks/useV3Profile";
import { haversineKm } from "@/lib/geoUtils";
import VIPPaywallModal from "@/components/v3/VIPPaywallModal";
import { toast } from "sonner";

type ActionCard = {
  type: "event" | "partner";
  id: string;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  address?: string | null;
  video_url?: string | null;
  date_time?: string | null;
  href: string;
  lat?: number | null;
  lng?: number | null;
  distanceKm?: number | null;
};
type Msg = { id: string; role: "user" | "assistant"; content: string; created_at?: string; cards?: ActionCard[] };

const HERO_CHIPS: { icon: any; label: string; prompt: string }[] = [
  { icon: Beer, label: "🍻 Happy Hour", prompt: "Onde tem happy hour hoje em Presidente Prudente?" },
  { icon: Music, label: "🎵 Música ao vivo", prompt: "Onde tem música ao vivo hoje em Prudente?" },
  { icon: Trophy, label: "⚽ Futebol", prompt: "Onde assistir o jogo hoje sem pagar couvert?" },
  { icon: Calendar, label: "📅 Agenda", prompt: "O que tem na agenda de hoje em Prudente?" },
  { icon: Car, label: "🚕 Transporte", prompt: "Como peço uma carona segura agora?" },
];

const QUICK_PROMPTS: { label: string; prompt: string }[] = [
  { label: "🍻 Happy Hour hoje", prompt: "Onde tem happy hour hoje em Presidente Prudente?" },
  { label: "🎵 Música ao vivo", prompt: "Onde tem música ao vivo hoje em Prudente?" },
  { label: "⚽ Onde assistir jogo", prompt: "Onde assistir o jogo hoje sem pagar couvert?" },
  { label: "📅 Agenda de hoje", prompt: "O que tem na agenda de hoje em Prudente?" },
  { label: "📍 Perto de mim", prompt: "Quais lugares legais estão perto de mim agora?" },
  { label: "🚕 Pedir carona", prompt: "Quero pedir uma carona, como funciona?" },
];

const FOLLOW_UPS = ["Pedir Carona", "Ver bares perto de mim", "Onde economizar hoje?", "Qual rolê combina comigo?"];

export default function V3AIChat() {
  const navigate = useNavigate();
  const { user, loading } = useV3Profile();
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [used, setUsed] = useState(0);
  const [paywall, setPaywall] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth?redirect=/ia");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("ai_chat_messages" as any).select("id,role,content,created_at").eq("user_id", user.id).order("created_at", { ascending: true }).limit(40)
      .then(({ data }) => setMessages(((data || []) as unknown as Msg[])));
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    supabase.from("ai_message_usage" as any).select("message_count").eq("user_id", user.id).eq("usage_date", today).maybeSingle()
      .then(({ data }: any) => setUsed(data?.message_count || 0));
  }, [user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  // GPS — same pattern used in /perto-de-mim
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
    );
  }, []);

  // Enrich cards with lat/lng once they arrive (batched, dedup by id)
  useEffect(() => {
    const eventIds = new Set<string>();
    const partnerIds = new Set<string>();
    for (const m of messages) {
      if (m.role !== "assistant" || !m.cards) continue;
      for (const c of m.cards) {
        if (c.lat != null && c.lng != null) continue;
        if (c.type === "event") eventIds.add(c.id);
        else partnerIds.add(c.id);
      }
    }
    if (!eventIds.size && !partnerIds.size) return;
    (async () => {
      const coords: Record<string, { lat: number | null; lng: number | null; type: "event" | "partner" }> = {};
      if (eventIds.size) {
        const { data } = await supabase.from("events").select("id,latitude,longitude,partner_id").in("id", Array.from(eventIds));
        const missingPartner = new Set<string>();
        (data || []).forEach((e: any) => {
          coords[`event:${e.id}`] = { lat: e.latitude, lng: e.longitude, type: "event" };
          if ((e.latitude == null || e.longitude == null) && e.partner_id) missingPartner.add(e.partner_id);
        });
        if (missingPartner.size) {
          const { data: ps } = await supabase.from("partners").select("id,latitude,longitude").in("id", Array.from(missingPartner));
          const pMap: Record<string, any> = {};
          (ps || []).forEach((p: any) => { pMap[p.id] = p; });
          (data || []).forEach((e: any) => {
            const c = coords[`event:${e.id}`];
            if (c && (c.lat == null || c.lng == null) && e.partner_id && pMap[e.partner_id]) {
              c.lat = pMap[e.partner_id].latitude;
              c.lng = pMap[e.partner_id].longitude;
            }
          });
        }
      }
      if (partnerIds.size) {
        const { data } = await supabase.from("partners").select("id,latitude,longitude").in("id", Array.from(partnerIds));
        (data || []).forEach((p: any) => { coords[`partner:${p.id}`] = { lat: p.latitude, lng: p.longitude, type: "partner" }; });
      }
      setMessages((prev) => prev.map((m) => {
        if (m.role !== "assistant" || !m.cards) return m;
        let changed = false;
        const next = m.cards.map((c) => {
          if (c.lat != null && c.lng != null) return c;
          const found = coords[`${c.type}:${c.id}`];
          if (!found || found.lat == null || found.lng == null) return c;
          changed = true;
          return { ...c, lat: found.lat, lng: found.lng };
        });
        return changed ? { ...m, cards: next } : m;
      }));
    })();
  }, [messages]);

  async function sendText(text: string) {
    if (!text || sending) return;
    setInput("");
    const optimistic: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages(prev => [...prev, optimistic]);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("prudente-ai", { body: { mode: "chat", message: text } });
      if (error) throw error;
      if (data?.error === "free_limit_reached") {
        setPaywall(true);
        setUsed(data.used || 3);
        return;
      }
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content: data.answer, cards: data.cards || [] }]);
      setUsed(data.used ?? used + 1);
    } catch (err: any) {
      const context = err?.context?.json ? await err.context.json().catch(() => null) : null;
      if (context?.error === "free_limit_reached") setPaywall(true);
      else toast.error("Aura indisponível", { description: context?.error || err.message });
    } finally {
      setSending(false);
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    await sendText(input.trim());
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <>
    <SEO
      title="Aura IA — Sua promoter inteligente da noite em Presidente Prudente | Roxou"
      description="Conheça a Aura, a inteligência artificial da Roxou que recomenda os melhores rolês, promoções e caronas seguras em Presidente Prudente. Descubra o que fazer hoje."
      canonical="https://roxou.com.br/ia"
      ogImage="https://roxou.com.br/og-aura.png"
      keywords="eventos Presidente Prudente, o que fazer em Prudente, baladas Prudente, bares em Prudente, agenda de eventos, Roxou, Aura IA"
      locale="pt_BR"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Aura IA",
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web",
        url: "https://roxou.com.br/ia",
        image: "https://roxou.com.br/og-aura.png",
        inLanguage: "pt-BR",
        description: "Aura é a inteligência artificial da Roxou que recomenda eventos, bares, baladas, promoções e caronas seguras em Presidente Prudente.",
        publisher: { "@type": "Organization", name: "Roxou", url: "https://roxou.com.br" },
        offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" }
      }}
    />
    <div className="fixed inset-0 lg:inset-x-0 lg:top-16 lg:bottom-0 z-[60] lg:z-10 flex flex-col overflow-hidden bg-background" style={{ height: "100dvh" }}>
      {/* Background neon glow ambient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-accent/10 blur-[100px]" />
      </div>

      {/* Header glass — respects iOS status bar / notch */}
      <header
        className="relative z-10 v3-glass-strong border-b border-primary/15 px-4 pb-3 lg:pt-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Link to="/" className="rounded-full p-2 hover:bg-white/5 transition"><ArrowLeft className="h-5 w-5 text-muted-foreground" /></Link>
          <div className="relative">
            <AuraAvatar className="h-10 w-10" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-background v3-pulse-glow" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-black text-foreground v3-neon-text">Aura 💜</h1>
            <p className="text-[10px] text-muted-foreground">{Math.max(0, 3 - used)} mensagens grátis hoje · ROXOU VIP ilimitado</p>
          </div>
          <button onClick={() => setPaywall(true)} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[10px] font-black text-primary hover:bg-primary/20 transition">
            <Crown className="mr-1 inline h-3 w-3" /> VIP
          </button>
        </div>
      </header>

      {/* Conversation — full-bleed mobile, centered desktop */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 pt-4 pb-6 scroll-smooth">
        <div className="max-w-2xl mx-auto space-y-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-6 pb-2 space-y-6 animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-primary/30 blur-2xl v3-pulse-glow" />
                <div className="relative h-20 w-20 rounded-3xl gradient-primary flex items-center justify-center neon-glow">
                  <Sparkles className="h-9 w-9 text-primary-foreground" />
                </div>
              </div>
              <div className="text-center space-y-2 px-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">💜 Roxou</p>
                <h2 className="font-display text-2xl font-black text-foreground">
                  Olá, eu sou a <span className="v3-neon-text">Aura</span>
                </h2>
                <p className="text-xs leading-relaxed text-muted-foreground max-w-sm">
                  Sua <strong className="text-primary font-black">inteligência artificial da Roxou</strong>. Pergunte sobre eventos, bares, happy hour ou peça uma carona. ✨
                </p>
              </div>

              {/* Hero chips */}
              <div className="flex flex-wrap justify-center gap-2 w-full max-w-md pt-1">
                {HERO_CHIPS.map(({ icon: Icon, label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => sendText(prompt)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-black text-primary hover:bg-primary/20 hover:border-primary/60 transition active:scale-95"
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={msg.id} className="space-y-2 animate-fade-in">
              <Bubble msg={msg} />
              {msg.role === "assistant" && msg.cards && msg.cards.length > 0 && (
                <div className="ml-10 grid gap-2.5">
                  {msg.cards.map((card) => <RichEventCard key={`${card.type}-${card.id}`} card={card} userLoc={userLoc} />)}
                </div>
              )}
              {msg.role === "assistant" && index === messages.length - 1 && !sending && (
                <div className="ml-10 flex gap-2 overflow-x-auto pb-1 pr-4 scrollbar-hide">
                  {FOLLOW_UPS.map((suggestion) => (
                    <button key={suggestion} onClick={() => sendText(suggestion)} className="shrink-0 whitespace-nowrap rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[10px] font-black text-primary transition hover:bg-primary/20">
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {sending && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>


      {/* Quick prompt chips — sticky above input, horizontal scroll on mobile */}
      <div className="v3-glass-strong border-t border-primary/15 pt-2">
        <div className="max-w-3xl mx-auto flex gap-2 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory pl-4 pr-6 lg:justify-center lg:flex-wrap lg:px-4">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q.label}
              onClick={() => sendText(q.prompt)}
              disabled={sending}
              className="snap-start shrink-0 whitespace-nowrap rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[11px] font-black text-primary hover:bg-primary/20 hover:border-primary/50 transition disabled:opacity-50 active:scale-95"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>


      {/* Input bar — rounded-full neon */}
      <form onSubmit={send} className="v3-glass-strong border-t border-primary/15 px-4 py-3 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto">
          <div
            className={`relative flex items-center gap-2 rounded-full bg-background/60 backdrop-blur px-2 py-1.5 border transition-all duration-300 ${
              inputFocused
                ? "border-primary/60 shadow-[0_0_24px_hsl(var(--v3-neon)/0.45)]"
                : "border-white/10"
            }`}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Conta pra Aura: qual a vibe de hoje?"
              className="flex-1 bg-transparent border-0 outline-none px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground transition disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_18px_hsl(var(--v3-neon)/0.6)]"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </form>
      <VIPPaywallModal open={paywall} onOpenChange={setPaywall} />
    </div>
    {/* SEO content block — discreet, off-screen for crawlers */}
    <section aria-label="Sobre a Aura" className="sr-only">
      <h1>Conheça a Aura 🤖💜</h1>
      <h2>Sua promoter inteligente da Roxou</h2>
      <p>
        A Aura é a inteligência artificial da Roxou que recomenda eventos em Presidente Prudente,
        ajuda você a descobrir o que fazer hoje e indica os melhores bares e baladas da cidade.
      </p>
      <p>
        A Aura da Roxou ajuda você a descobrir os melhores eventos em Presidente Prudente,
        incluindo bares, baladas e festas que acontecem hoje na cidade.
      </p>
    </section>
    </>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 animate-fade-in">
      <AuraAvatar className="mt-1 h-7 w-7 shrink-0 rounded-xl" />
      <div className="v3-glass rounded-3xl rounded-bl-lg px-5 py-3.5 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-primary v3-pulse-glow" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 rounded-full bg-primary v3-pulse-glow" style={{ animationDelay: "200ms" }} />
        <span className="h-2 w-2 rounded-full bg-primary v3-pulse-glow" style={{ animationDelay: "400ms" }} />
      </div>
    </div>
  );
}

const RichEventCard = memo(function RichEventCard({ card, userLoc }: { card: ActionCard; userLoc: { lat: number; lng: number } | null }) {
  const isEvent = card.type === "event";
  const dt = card.date_time ? new Date(card.date_time) : null;
  const timeLabel = dt
    ? dt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

  const distanceKm = useMemo(() => {
    if (!userLoc || card.lat == null || card.lng == null) return null;
    return haversineKm(userLoc, { lat: card.lat, lng: card.lng });
  }, [userLoc, card.lat, card.lng]);

  const distanceLabel = distanceKm == null
    ? null
    : distanceKm < 1
    ? `${Math.round(distanceKm * 1000)} m`
    : `${distanceKm.toFixed(1)} km`;

  const mapsHref = card.lat != null && card.lng != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${card.lat},${card.lng}`
    : card.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${card.title} ${card.address}`)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${card.title} Presidente Prudente`)}`;

  const rideHref = isEvent
    ? `/pedir-carona?eventId=${card.id}`
    : `/transporte?venue=${encodeURIComponent(card.title)}`;

  return (
    <div className="group relative overflow-hidden rounded-2xl v3-glass border border-primary/20 transition-all hover:border-primary/50 hover:shadow-[0_0_24px_hsl(var(--v3-neon)/0.25)]">
      <Link to={card.href} className="flex gap-3 p-2.5">
        <div className="relative h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-secondary">
          <img src={card.image_url || "/placeholder.svg"} alt={card.title} className="h-full w-full object-cover" loading="lazy" />
          {isEvent && card.video_url && (
            <span className="absolute top-1 right-1 rounded-full bg-primary/90 p-1 backdrop-blur">
              <Video className="h-2.5 w-2.5 text-primary-foreground" />
            </span>
          )}
          {distanceLabel && (
            <span className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-full bg-background/85 backdrop-blur px-1.5 py-0.5 text-[9px] font-black text-primary">
              <Navigation className="h-2.5 w-2.5" /> {distanceLabel}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
          <div>
            <p className="line-clamp-2 text-sm font-black text-foreground group-hover:text-primary transition leading-tight">{card.title}</p>
            <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" /> {card.subtitle || "ROXOU"}
            </p>
          </div>
          {timeLabel && (
            <span className="mt-1 self-start rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 text-[9px] font-black uppercase text-primary">
              {timeLabel}
            </span>
          )}
        </div>
      </Link>

      {/* Quick action bar */}
      <div className="flex items-center gap-1 border-t border-white/5 bg-background/30 px-2 py-1.5">
        <Link
          to={card.href}
          className="flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-black text-foreground/80 hover:bg-primary/15 hover:text-primary transition"
        >
          <Sparkles className="h-3 w-3" /> Ver local
        </Link>
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-black text-foreground/80 hover:bg-primary/15 hover:text-primary transition border-l border-white/5"
        >
          <MapPin className="h-3 w-3" /> Como chegar
        </a>
        <Link
          to={rideHref}
          className="flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-black text-primary hover:bg-primary/15 transition border-l border-white/5"
        >
          <Car className="h-3 w-3" /> Pedir carona
        </Link>
      </div>
    </div>
  );
});

function Bubble({ msg }: { msg: Msg }) {
  const mine = msg.role === "user";
  return (
    <div className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine && <AuraAvatar className="mt-1 h-7 w-7 shrink-0 rounded-xl" />}
      <div
        className={`max-w-[82%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
          mine
            ? "gradient-primary text-primary-foreground rounded-br-lg shadow-[0_0_18px_hsl(var(--v3-neon)/0.35)]"
            : "v3-glass border border-white/10 text-foreground rounded-bl-lg"
        }`}
      >
        {mine ? (
          msg.content.split("\n").map((line, i) => <p key={i} className="mb-1 last:mb-0">{line}</p>)
        ) : (
          <div className="prudente-md">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-black text-primary v3-neon-text" {...props} />,
                em: ({ node, ...props }) => <em className="text-foreground/90 italic" {...props} />,
                ul: ({ node, ...props }) => <ul className="my-2 space-y-1.5 pl-1" {...props} />,
                ol: ({ node, ...props }) => <ol className="my-2 space-y-1.5 pl-5 list-decimal" {...props} />,
                li: ({ node, children, ...props }) => (
                  <li className="flex gap-2 leading-relaxed" {...props}>
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--v3-neon))]" />
                    <span className="flex-1">{children}</span>
                  </li>
                ),
                a: ({ node, ...props }) => <a className="text-primary underline underline-offset-2 hover:text-accent" target="_blank" rel="noopener noreferrer" {...props} />,
                code: ({ node, ...props }) => <code className="rounded bg-primary/15 px-1.5 py-0.5 text-[12px] text-primary" {...props} />,
                h1: ({ node, ...props }) => <h3 className="mt-2 mb-1 font-display text-base font-black text-foreground" {...props} />,
                h2: ({ node, ...props }) => <h3 className="mt-2 mb-1 font-display text-base font-black text-foreground" {...props} />,
                h3: ({ node, ...props }) => <h3 className="mt-2 mb-1 font-display text-sm font-black text-foreground" {...props} />,
                blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-primary/50 pl-3 italic text-muted-foreground" {...props} />,
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
      {mine && <div className="mt-1 h-7 w-7 shrink-0 rounded-xl bg-secondary flex items-center justify-center"><User className="h-4 w-4 text-muted-foreground" /></div>}
    </div>
  );
}
