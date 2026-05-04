import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useV3Profile } from "@/hooks/useV3Profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Message = Tables<"transport_messages">;

export default function V3Chat() {
  const { requestId } = useParams<{ requestId: string }>();
  const { user, loading: profileLoading } = useV3Profile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rideInfo, setRideInfo] = useState<{ event_name?: string | null; destination_address?: string | null }>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!requestId || profileLoading) return;
    loadMessages();
    loadRideInfo();

    const channel = supabase
      .channel(`chat-${requestId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transport_messages", filter: `ride_request_id=eq.${requestId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [requestId, profileLoading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("transport_messages")
      .select("*")
      .eq("ride_request_id", requestId!)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setLoading(false);
  };

  const loadRideInfo = async () => {
    const { data } = await supabase
      .from("ride_requests")
      .select("event_name, destination_address")
      .eq("id", requestId!)
      .maybeSingle();
    if (data) setRideInfo(data);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user || !requestId) return;
    setSending(true);
    try {
      const { error } = await supabase.from("transport_messages").insert({
        ride_request_id: requestId,
        sender_id: user.id,
        content: text.trim(),
      });
      if (error) throw error;
      setText("");
    } catch {
      // silently fail, message won't appear
    } finally {
      setSending(false);
    }
  };

  if (profileLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-4 py-6 text-center space-y-3">
        <p className="text-muted-foreground text-sm">Faça login para acessar o chat.</p>
        <Link to={`/auth?redirect=/chat/${requestId}`}>
          <Button className="rounded-xl">Entrar</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-120px)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link to="/transporte" className="p-1.5 -ml-1 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div className="min-w-0">
            <p className="font-display font-semibold text-sm text-foreground truncate">
              {rideInfo.event_name || "Corrida"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {rideInfo.destination_address || "Chat"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-10">
            Nenhuma mensagem ainda. Diga olá! 👋
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === user.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${
                  isMine
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border/40 text-foreground rounded-bl-md"
                }`}
              >
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="px-4 py-3 border-t border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 h-11 rounded-xl bg-background border-border/40 text-sm"
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !text.trim()}
            className="h-11 w-11 rounded-xl shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
