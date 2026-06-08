import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Send, MessageCircle, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { sanitizeText } from "@/lib/sanitize";

interface FootballMatchChatProps {
  matchSlug: string;
  matchTitle: string;
  compact?: boolean;
}

interface ChatMessage {
  id: string;
  match_slug: string;
  user_id: string;
  user_name: string | null;
  message: string;
  created_at: string;
}

interface ProfileInfo {
  display_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
}

const MAX_LEN = 280;
const FALLBACK_NAME = "Torcedor Roxou";
const FORBIDDEN = [
  "macaco preto", "preto fedido", "viado", "viadinho", "bicha nojenta",
  "te mato", "vou te matar", "morre", "stupr",
  "<script", "javascript:", "drop table", "select * from", "; --", "union select",
];

function containsForbidden(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN.some((w) => lower.includes(w));
}

/**
 * Garante que nunca vamos exibir um e-mail (mesmo legado).
 * Se vier algo com "@" ou pontuação típica de e-mail, devolvemos null.
 */
function sanitizeDisplayName(raw?: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  if (t.includes("@")) return null;
  if (/^[a-z0-9._+-]+$/i.test(t) && t.length <= 24 && !t.includes(" ")) {
    // handles tipo "contato", "joao.silva" — pode ser prefixo de e-mail. Trata como fraco.
    return null;
  }
  return t;
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

export default function FootballMatchChat({ matchSlug, matchTitle, compact = false }: FootballMatchChatProps) {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSentRef = useRef<{ text: string; at: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Busca perfis públicos (display_name/nickname/avatar) dos autores das mensagens
  const fetchProfiles = useCallback(async (userIds: string[]) => {
    const missing = userIds.filter((id) => id && !profiles[id]);
    if (missing.length === 0) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, nickname, avatar_url")
      .in("user_id", missing);
    if (!data) return;
    setProfiles((prev) => {
      const next = { ...prev };
      data.forEach((p: any) => {
        next[p.user_id] = {
          display_name: p.display_name,
          nickname: p.nickname,
          avatar_url: p.avatar_url,
        };
      });
      return next;
    });
  }, [profiles]);

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
        const list = ((data ?? []) as ChatMessage[]).slice().reverse();
        setMessages(list);
        setLoading(false);
        const ids = Array.from(new Set(list.map((m) => m.user_id).filter(Boolean)));
        if (ids.length) fetchProfiles(ids);
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
            if (m.user_id) fetchProfiles([m.user_id]);
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchSlug]);

  // Auto-scroll
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Resolve nome público priorizando profile > metadata > fallback (nunca e-mail)
  const resolveName = useCallback((m: ChatMessage): string => {
    const p = profiles[m.user_id];
    return (
      sanitizeDisplayName(p?.display_name) ||
      sanitizeDisplayName(p?.nickname) ||
      sanitizeDisplayName(m.user_name) ||
      FALLBACK_NAME
    );
  }, [profiles]);

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

    // Resolver nome do remetente SEM cair em email
    const myProfile = profiles[user.id];
    const displayName =
      sanitizeDisplayName(myProfile?.display_name) ||
      sanitizeDisplayName(myProfile?.nickname) ||
      sanitizeDisplayName(user.user_metadata?.full_name as string | undefined) ||
      sanitizeDisplayName(user.user_metadata?.name as string | undefined) ||
      sanitizeDisplayName(user.user_metadata?.display_name as string | undefined) ||
      FALLBACK_NAME;

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
          🔥 Torcida Roxou
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
                const name = resolveName(m);
                const avatar = profiles[m.user_id]?.avatar_url || null;
                return (
                  <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                    <div className="h-8 w-8 shrink-0 rounded-full bg-primary/20 text-primary text-[11px] font-bold flex items-center justify-center overflow-hidden">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        initials(name)
                      )}
                    </div>
                    <div className={`max-w-[78%] ${mine ? "text-right" : ""}`}>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-0.5">
                        <span className="font-semibold text-foreground/80 truncate max-w-[140px]">
                          {name}
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
