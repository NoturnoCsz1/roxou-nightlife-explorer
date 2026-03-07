import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, MapPin, Bookmark, Share2 } from "lucide-react";
import { events } from "@/data/events";
import { useState } from "react";
import { toast } from "sonner";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = events.find((e) => e.id === id);
  const [saved, setSaved] = useState(false);

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Evento não encontrado.</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const handleSave = () => {
    setSaved(!saved);
    toast(saved ? "Evento removido dos salvos" : "Evento salvo! ✨");
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: event.title, text: event.description, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copiado! 🔗");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Hero */}
      <div className="relative">
        <img
          src={event.image}
          alt={event.title}
          className="aspect-[3/4] w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 rounded-full bg-background/60 p-2 text-foreground backdrop-blur-sm transition hover:bg-background/80"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-lg -mt-20 relative z-10 px-4">
        <span className="mb-3 inline-block rounded-full gradient-primary px-3 py-1 text-[11px] font-bold text-primary-foreground">
          {event.categoryLabel}
        </span>
        <h1 className="text-2xl font-bold text-foreground font-display neon-text mb-2">
          {event.title}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">{event.venue}</p>

        {/* Info */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 rounded-xl bg-card p-4">
            <Calendar className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground capitalize">{formatDate(event.date)}</p>
              <p className="text-xs text-muted-foreground">Data do evento</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-card p-4">
            <Clock className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{event.time}</p>
              <p className="text-xs text-muted-foreground">Horário</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-card p-4">
            <MapPin className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{event.venue}</p>
              <p className="text-xs text-muted-foreground">{event.address}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-8">
          <h2 className="mb-2 text-base font-bold font-display text-foreground">Sobre o evento</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{event.description}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all ${
              saved
                ? "gradient-primary text-primary-foreground neon-glow"
                : "bg-card text-foreground hover:neon-border"
            }`}
          >
            <Bookmark className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
            {saved ? "Salvo" : "Salvar"}
          </button>
          <button
            onClick={handleShare}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-card py-3.5 text-sm font-bold text-foreground transition-all hover:neon-border"
          >
            <Share2 className="h-5 w-5" />
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
