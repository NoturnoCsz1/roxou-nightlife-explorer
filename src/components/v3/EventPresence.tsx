import { Link } from "react-router-dom";
import { Flame, Eye } from "lucide-react";
import { useEventPresence } from "@/hooks/useEventPresence";
import { cn } from "@/lib/utils";

interface Props {
  eventId: string;
}

export default function EventPresence({ eventId }: Props) {
  const { counts, myStatus, saving, toggle, isAuthed } = useEventPresence(eventId);

  const totalGoing = counts.going;
  const totalInterested = counts.interested;

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-3 space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-primary" />
          <strong className="text-foreground font-semibold">{totalGoing}</strong> indo
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-primary/80" />
          <strong className="text-foreground font-semibold">{totalInterested}</strong> interessados
        </span>
      </div>

      {isAuthed ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => toggle("going")}
            className={cn(
              "h-10 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all",
              myStatus === "going"
                ? "bg-primary text-primary-foreground border-primary shadow-[0_0_18px_hsl(var(--primary)/0.4)]"
                : "bg-background/40 text-foreground border-border/40 hover:border-primary/50"
            )}
          >
            🔥 Vou
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => toggle("interested")}
            className={cn(
              "h-10 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all",
              myStatus === "interested"
                ? "bg-primary/20 text-primary border-primary/60"
                : "bg-background/40 text-foreground border-border/40 hover:border-primary/50"
            )}
          >
            👀 Interessado
          </button>
        </div>
      ) : (
        <Link
          to="/auth"
          className="block text-center h-10 leading-[2.5rem] rounded-xl text-xs font-bold uppercase tracking-wider border border-border/40 bg-background/40 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
        >
          Entrar para marcar presença
        </Link>
      )}
    </div>
  );
}
