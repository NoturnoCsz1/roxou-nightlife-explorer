import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, Crown, Loader2, Send, Sparkles, User, MapPin, Car, Video, Beer, Music, PartyPopper, Wine } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useV3Profile } from "@/hooks/useV3Profile";
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
};
type Msg = { id: string; role: "user" | "assistant"; content: string; created_at?: string; cards?: ActionCard[] };

const STARTER_CARDS = [
  { icon: Music, label: "Sertanejo", prompt: "Qual o melhor rolê sertanejo essa semana em Prudente?", gradient: "from-amber-500/20 to-orange-500/10" },
  { icon: Beer, label: "Open Bar", prompt: "Tem alguma festa com open bar rolando hoje ou no fim de semana?", gradient: "from-purple-500/20 to-fuchsia-500/10" },
  { icon: PartyPopper, label: "Expo 2026", prompt: "Como estão os preparativos da Expo Prudente 2026? O que rola por lá?", gradient: "from-pink-500/20 to-rose-500/10" },
  { icon: Wine, label: "Happy Hour", prompt: "Onde tem happy hour bom hoje em Presidente Prudente?", gradient: "from-cyan-500/20 to-blue-500/10" },
];

const FOLLOW_UPS = ["Pedir Carona", "Ver bares perto de mim", "Onde economizar hoje?", "Qual rolê combina comigo?"];

export default function V3AIChat() {
  const navigate = useNavigate();
  const { user, loading } = useV3Profile();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [used, setUsed] = useState(0);
  const [paywall, setPaywall] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/v3/auth?redirect=/v3/ia");
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
    <div className="fixed inset-0 lg:inset-x-0 lg:top-14 lg:bottom-0 z-50 lg:z-10 flex flex-col overflow-hidden bg-background" style={{ height: "100dvh" }}>
      {/* Background neon glow ambient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-accent/10 blur-[100px]" />
      </div>

      {/* Header glass */}
      <header className="v3-glass-strong border-b border-primary/15 px-4 py-3">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Link to="/v3" className="rounded-full p-2 hover:bg-white/5 transition"><ArrowLeft className="h-5 w-5 text-muted-foreground" /></Link>
          <div className="relative h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center neon-glow">
            <Bot className="h-5 w-5 text-primary-foreground" />
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

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
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

              {/* Starter cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md pt-2">
                {STARTER_CARDS.map(({ icon: Icon, label, prompt, gradient }) => (
                  <button
                    key={label}
                    onClick={() => sendText(prompt)}
                    className={`group relative overflow-hidden rounded-2xl v3-glass border border-white/10 p-4 text-left transition-all hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-[0_0_24px_hsl(var(--v3-neon)/0.25)]`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
                    <div className="relative flex flex-col gap-2">
                      <div className="h-9 w-9 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-foreground">{label}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{prompt}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={msg.id} className="space-y-2 animate-fade-in">
              <Bubble msg={msg} />
              {msg.role === "assistant" && msg.cards && msg.cards.length > 0 && (
                <div className="ml-9 grid gap-2.5">
                  {msg.cards.map((card) => <RichEventCard key={`${card.type}-${card.id}`} card={card} />)}
                </div>
              )}
              {msg.role === "assistant" && index === messages.length - 1 && !sending && (
                <div className="ml-9 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {FOLLOW_UPS.map((suggestion) => (
                    <button key={suggestion} onClick={() => sendText(suggestion)} className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[10px] font-black text-primary transition hover:bg-primary/20">
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
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 animate-fade-in">
      <div className="mt-1 h-7 w-7 shrink-0 rounded-xl bg-primary/15 flex items-center justify-center">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="v3-glass rounded-3xl rounded-bl-lg px-5 py-3.5 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-primary v3-pulse-glow" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 rounded-full bg-primary v3-pulse-glow" style={{ animationDelay: "200ms" }} />
        <span className="h-2 w-2 rounded-full bg-primary v3-pulse-glow" style={{ animationDelay: "400ms" }} />
      </div>
    </div>
  );
}

function RichEventCard({ card }: { card: ActionCard }) {
  const isEvent = card.type === "event";
  const dt = card.date_time ? new Date(card.date_time) : null;
  const timeLabel = dt
    ? dt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

  const mapsHref = card.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${card.title} ${card.address}`)}`
    : card.subtitle
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${card.subtitle} Presidente Prudente`)}`
    : null;

  const uberHref = card.address
    ? `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(card.address)}`
    : "https://m.uber.com/";

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
        <a
          href={uberHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-black text-foreground/80 hover:bg-primary/15 hover:text-primary transition"
        >
          <Car className="h-3 w-3" /> Uber/99
        </a>
        {mapsHref && (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-black text-foreground/80 hover:bg-primary/15 hover:text-primary transition border-l border-white/5"
          >
            <MapPin className="h-3 w-3" /> Mapa
          </a>
        )}
        {isEvent && card.video_url && (
          <a
            href={card.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-black text-primary hover:bg-primary/15 transition border-l border-white/5"
          >
            <Video className="h-3 w-3" /> POV
          </a>
        )}
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const mine = msg.role === "user";
  return (
    <div className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine && <div className="mt-1 h-7 w-7 shrink-0 rounded-xl bg-primary/15 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>}
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
