import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, Crown, Loader2, Send, Sparkles, User, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useV3Profile } from "@/hooks/useV3Profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VIPPaywallModal from "@/components/v3/VIPPaywallModal";
import { toast } from "sonner";

type ActionCard = { type: "event" | "partner"; id: string; title: string; subtitle?: string | null; image_url?: string | null; href: string };
type Msg = { id: string; role: "user" | "assistant"; content: string; created_at?: string; cards?: ActionCard[] };

const FOLLOW_UPS = ["Pedir Carona", "Ver bares perto de mim", "Onde economizar hoje?", "Qual rolê combina comigo?"];

export default function V3AIChat() {
  const navigate = useNavigate();
  const { user, loading } = useV3Profile();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [used, setUsed] = useState(0);
  const [paywall, setPaywall] = useState(false);
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

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
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
      else toast.error("Prudente IA indisponível", { description: context?.error || err.message });
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="flex h-[calc(100dvh-132px)] flex-col">
      <header className="v3-glass-strong border-b border-border/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/v3" className="rounded-full p-2 hover:bg-card"><ArrowLeft className="h-5 w-5 text-muted-foreground" /></Link>
          <div className="h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center neon-glow"><Bot className="h-5 w-5 text-primary-foreground" /></div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-black text-foreground">Prudente IA</h1>
            <p className="text-[10px] text-muted-foreground">{Math.max(0, 3 - used)} mensagens grátis hoje · ROXOU VIP ilimitado</p>
          </div>
          <button onClick={() => setPaywall(true)} className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[10px] font-black text-primary"><Crown className="mr-1 inline h-3 w-3" /> VIP</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="rounded-3xl v3-glass v3-pulse-glow p-5 text-center space-y-3">
            <Sparkles className="mx-auto h-8 w-8 text-primary" />
            <h2 className="font-display text-xl font-black text-foreground">Qual rolê combina com hoje?</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">Pergunte sobre happy hour, bares, eventos, carona, economia ou onde ir em Presidente Prudente.</p>
          </div>
        )}
        {messages.map((msg, index) => (
          <div key={msg.id} className="space-y-2">
            <Bubble msg={msg} />
            {msg.role === "assistant" && msg.cards && msg.cards.length > 0 && (
              <div className="ml-9 grid gap-2 sm:grid-cols-2">
                {msg.cards.map((card) => <MiniActionCard key={`${card.type}-${card.id}`} card={card} />)}
              </div>
            )}
            {msg.role === "assistant" && index === messages.length - 1 && !sending && (
              <div className="ml-9 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {FOLLOW_UPS.map((suggestion) => (
                  <button key={suggestion} onClick={() => setInput(suggestion)} className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[10px] font-black text-primary transition hover:bg-primary/20">
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {sending && <Bubble msg={{ id: "typing", role: "assistant", content: "Pensando com dados reais da ROXOU..." }} muted />}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="v3-glass-strong border-t border-border/20 px-4 py-3">
        <div className="flex gap-2">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ex: onde economizar no happy hour hoje?" className="h-11 rounded-2xl bg-background/70 border-border/40 text-sm" />
          <Button type="submit" disabled={sending || !input.trim()} size="icon" className="h-11 w-11 rounded-2xl"><Send className="h-4 w-4" /></Button>
        </div>
      </form>
      <VIPPaywallModal open={paywall} onOpenChange={setPaywall} />
    </div>
  );
}

function MiniActionCard({ card }: { card: ActionCard }) {
  return (
    <Link to={card.href} className="group flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-2 transition-all hover:border-primary/50 hover:bg-primary/15">
      <img src={card.image_url || "/placeholder.svg"} alt={card.title} className="h-14 w-14 rounded-xl object-cover" loading="lazy" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-xs font-black text-foreground group-hover:text-primary">{card.title}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground"><MapPin className="h-3 w-3" /> {card.subtitle || "ROXOU"}</p>
        <span className="mt-1 inline-flex rounded-full bg-primary px-2.5 py-1 text-[9px] font-black uppercase text-primary-foreground">Ver detalhes</span>
      </div>
    </Link>
  );
}

function Bubble({ msg, muted }: { msg: Msg; muted?: boolean }) {
  const mine = msg.role === "user";
  return (
    <div className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine && <div className="mt-1 h-7 w-7 shrink-0 rounded-xl bg-primary/15 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>}
      <div className={`max-w-[82%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${mine ? "bg-primary text-primary-foreground rounded-br-lg" : "v3-glass text-foreground rounded-bl-lg"} ${muted ? "animate-pulse text-muted-foreground" : ""}`}>
        {msg.content.split("\n").map((line, i) => <p key={i} className="mb-1 last:mb-0">{line}</p>)}
      </div>
      {mine && <div className="mt-1 h-7 w-7 shrink-0 rounded-xl bg-secondary flex items-center justify-center"><User className="h-4 w-4 text-muted-foreground" /></div>}
    </div>
  );
}
