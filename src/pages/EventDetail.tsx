import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, MapPin, Bookmark, Share2, ExternalLink } from "lucide-react";
import { events } from "@/data/events";
import { useState } from "react";
import { toast } from "sonner";
import { usePageTracking } from "@/hooks/usePageTracking";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = events.find((e) => e.id === id);
  const [saved, setSaved] = useState(false);
  usePageTracking({ event_id: id });

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
    <div className="min-h-screen bg-background">
      {/* Hero image */}
      <div className="relative">
        <img
          src={event.image}
          alt={event.title}
          className="aspect-[3/4] w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/20" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 rounded-full glass p-2.5 text-foreground transition hover:neon-border"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Badges */}
        <div className="absolute left-4 top-16 flex gap-2">
          {event.isToday && (
            <span className="badge-hoje rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
              Hoje
            </span>
          )}
          <span className={`${event.badgeClass} rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider`}>
            {event.categoryLabel}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-lg -mt-24 relative z-10 px-4 pb-10">
        <h1 className="text-2xl font-black text-foreground font-display neon-text mb-1 leading-tight">
          {event.title}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">{event.venue}</p>

        {/* Info cards */}
        <div className="space-y-2.5 mb-6">
          <div className="flex items-center gap-4 rounded-2xl bg-card p-4 card-shadow">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shrink-0">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground capitalize">{formatDate(event.date)}</p>
              <p className="text-[11px] text-muted-foreground">Data do evento</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-card p-4 card-shadow">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shrink-0">
              <Clock className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{event.time}</p>
              <p className="text-[11px] text-muted-foreground">Horário de início</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-card p-4 card-shadow">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shrink-0">
              <MapPin className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{event.venue}</p>
              <p className="text-[11px] text-muted-foreground">{event.address}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-8">
          <h2 className="mb-2 text-base font-black font-display text-foreground">Sobre o evento</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{event.description}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all active:scale-95 ${
              saved
                ? "gradient-primary text-primary-foreground neon-glow"
                : "bg-card text-foreground card-shadow hover:neon-border"
            }`}
          >
            <Bookmark className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
            {saved ? "Salvo" : "Salvar"}
          </button>
          <button
            onClick={handleShare}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-card py-4 text-sm font-bold text-foreground card-shadow transition-all active:scale-95 hover:neon-border"
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
