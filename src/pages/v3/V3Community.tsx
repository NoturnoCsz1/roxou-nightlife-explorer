import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MessagesSquare, Users, Sparkles } from "lucide-react";

interface Room {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: "event" | "partner" | "global";
  is_active: boolean;
}

export default function V3Community() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Comunidade Roxou — Em breve";
    (async () => {
      const { data } = await supabase
        .from("community_rooms")
        .select("id,slug,name,description,type,is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setRooms((data as Room[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen pb-24 pt-6 px-4 max-w-3xl mx-auto">
      <header className="mb-6">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-primary/80">
          <Sparkles className="w-3.5 h-3.5" />
          Em breve
        </div>
        <h1 className="text-3xl font-bold mt-2">Comunidade Roxou</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Salas de conversa em tempo real para os eventos e locais que você curte.
          Estamos preparando essa experiência com moderação, segurança e zero spam.
        </p>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm p-6 text-sm text-muted-foreground">
          Carregando salas…
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm p-6 text-center">
          <MessagesSquare className="w-8 h-8 text-primary/70 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Ainda não há salas abertas. Em breve, cada evento e local terá a sua.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {rooms.map((room) => (
            <li
              key={room.id}
              className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm p-4 flex items-start gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold truncate">{room.name}</h2>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                    {room.type}
                  </span>
                </div>
                {room.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {room.description}
                  </p>
                )}
              </div>
              <button
                disabled
                className="text-xs px-3 py-1.5 rounded-full border border-border/40 bg-background/40 text-muted-foreground cursor-not-allowed"
                title="Em breve"
              >
                Em breve
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-muted-foreground/70 mt-6 text-center">
        Voltar para a <Link to="/" className="text-primary hover:underline">home</Link>.
      </p>
    </div>
  );
}
