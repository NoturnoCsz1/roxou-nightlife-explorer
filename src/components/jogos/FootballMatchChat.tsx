import { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Send, MessageCircle, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { sanitizeText } from "@/lib/sanitize";

interface FootballMatchChatProps {
  matchSlug: string;
  matchTitle: string;
}

interface ChatMessage {
  id: string;
  match_slug: string;
  user_id: string;
  user_name: string | null;
  message: string;
  created_at: string;
}

const MAX_LEN = 280;
const FORBIDDEN = [
  // racismo / ofensas graves / ameaças (pt-br básico)
  "macaco preto", "preto fedido", "viado", "viadinho", "bicha nojenta",
  "te mato", "vou te matar", "morre", "stupr",
  // injection básico
  "<script", "javascript:", "drop table", "select * from", "; --", "union select",
];

function containsForbidden(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN.some((w) => lower.includes(w));
}

function initials(name?: string | null): string {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  } catch {
    return "";
  }
}

export default function FootballMatchChat({ matchSlug, matchTitle }: FootballMatchChatProps) {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSentRef = useRef<{ text: string; at: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Carregar últimas 50 + subscribe realtime
  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from("football_chat_messages")
      .select("id, match_slug, user_id, user_name, message, created_at")
      .eq("match_slug", matchSlug)
      .eq("is_deleted", false)
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!active) return;
        setMessages(((data ?? []) as ChatMessage[]).slice().reverse());
        setLoading(false);
      });

    const channel = supabase
      .channel(`football_chat_${matchSlug}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "football_chat_messages",
          filter: `match_slug=eq.${matchSlug}`,
        },
        (payload) => {
          const m = payload.new as ChatMessage;
          if (m.message && !((m as any).is_deleted)) {
            setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [matchSlug]);

  // Auto-scroll
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const remaining = useMemo(() => MAX_LEN - text.length, [text]);
  const canSend = text.trim().length > 0 && text.length <= MAX_LEN && !sending;

  async function handleSend() {
    if (!user || !canSend) return;
    setError(null);
    const raw = text;
    const cleaned = sanitizeText(raw, MAX_LEN);
    if (!cleaned) {
      setError("Mensagem vazia.");
      return;
    }
    if (containsForbidden(cleaned)) {
      setError("Mensagem bloqueada por violar as regras da comunidade.");
      return;
    }
    const now = Date.now();
    if (lastSentRef.current) {
      if (now - lastSentRef.current.at < 3000) {
        setError("Aguarde alguns segundos antes de enviar outra mensagem.");
        return;
      }
      if (lastSentRef.current.text === cleaned) {
        setError("Mensagem repetida. Escreva algo novo.");
        return;
      }
    }

    setSending(true);
    const displayName =
      (user.user_metadata?.display_name as string) ||
      (user.user_metadata?.full_name as string) ||
      user.email?.split("@")[0] ||
      "Torcedor";

    const { error: insertError } = await supabase.from("football_chat_messages").insert({
      match_slug: matchSlug,
      user_id: user.id,
      user_name: displayName,
      message: cleaned,
    });
    setSending(false);
    if (insertError) {
      setError("Não foi possível enviar. Tente novamente.");
      return;
    }
    lastSentRef.current = { text: cleaned, at: now };
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card/60 to-background p-4 md:p-5 shadow-[0_0_30px_-15px_hsl(var(--primary)/0.5)]">
      <header className="mb-3">
        <h2 className="font-display font-black text-base md:text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          💬 Chat Roxou do Jogo
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Comente, vibre e combine onde assistir {matchTitle} com a galera.
        </p>
      </header>

      {!user && !authLoading ? (
        <div className="rounded-xl border border-border/40 bg-card/40 p-5 text-center">
          <p className="font-semibold text-sm mb-1">Entre para participar do chat</p>
          <p className="text-xs text-muted-foreground mb-4">
            É rápido — comente o jogo em tempo real com outros torcedores em Prudente.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Link
              to="/v3/auth"
              className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground font-bold text-xs px-4 py-2 hover:bg-primary/90 transition"
            >
              <LogIn className="h-3.5 w-3.5" /> Entrar
            </Link>
            <Link
              to="/v3/auth"
              className="inline-flex items-center gap-1 rounded-full border border-primary/40 text-primary font-bold text-xs px-4 py-2 hover:bg-primary/10 transition"
            >
              Criar conta
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={listRef}
            className="max-h-[360px] overflow-y-auto space-y-3 rounded-xl border border-border/30 bg-background/40 p-3"
          >
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-6">Carregando mensagens…</p>
            ) : messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Seja o primeiro a comentar este jogo. 🔥
              </p>
            ) : (
              messages.map((m) => {
                const mine = m.user_id === user?.id;
                return (
                  <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                    <div className="h-8 w-8 shrink-0 rounded-full bg-primary/20 text-primary text-[11px] font-bold flex items-center justify-center">
                      {initials(m.user_name)}
                    </div>
                    <div className={`max-w-[78%] ${mine ? "text-right" : ""}`}>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-0.5">
                        <span className="font-semibold text-foreground/80 truncate max-w-[140px]">
                          {m.user_name || "Torcedor"}
                        </span>
                        <span>{formatTime(m.created_at)}</span>
                      </div>
                      <div
                        className={`inline-block rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                          mine
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-card/80 border border-border/40 rounded-tl-sm"
                        }`}
                      >
                        {m.message}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-3">
            <div className="flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder="Mande sua vibe… (Enter envia, Shift+Enter quebra linha)"
                className="flex-1 resize-none rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                maxLength={MAX_LEN}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition"
                aria-label="Enviar mensagem"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
              <span className={error ? "text-red-400" : ""}>
                {error ?? "Respeite a comunidade. Mensagens ofensivas são bloqueadas."}
              </span>
              <span>{text.length}/{MAX_LEN}</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
