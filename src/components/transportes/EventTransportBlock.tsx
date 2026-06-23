/**
 * EventTransportBlock — Fase 7.4
 *
 * Bloco opcional para páginas de evento que mostra opções de mobilidade
 * (excursões oficiais, caronas, como chegar). É puramente um atalho para
 * outras seções já existentes — não busca dados aqui para evitar regressão.
 */
import { Link } from "react-router-dom";
import { Bus, Car, MapPin, Ticket } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Props {
  eventId?: string;
  eventTitle?: string;
  ticketsUrl?: string | null;
  mapsAddress?: string | null;
  className?: string;
}

export default function EventTransportBlock({
  eventTitle,
  ticketsUrl,
  mapsAddress,
  className = "",
}: Props) {
  const mapsHref = mapsAddress
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapsAddress)}`
    : null;

  return (
    <section className={`space-y-2 ${className}`} aria-label="Como ir ao evento">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Como você vai?
      </h2>
      <div className="grid grid-cols-1 gap-2">
        {ticketsUrl ? (
          <a
            href={ticketsUrl}
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            <Card className="p-3 flex items-center gap-3 hover:bg-muted/30 transition">
              <Ticket className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Ingressos</p>
                <p className="text-[11px] text-muted-foreground">
                  Garanta seu acesso ao evento
                </p>
              </div>
            </Card>
          </a>
        ) : null}

        <Link to="/transportes/excursoes" className="block">
          <Card className="p-3 flex items-center gap-3 hover:bg-muted/30 transition">
            <Bus className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Excursões Oficiais</p>
              <p className="text-[11px] text-muted-foreground">
                Ônibus com saída garantida{eventTitle ? ` para ${eventTitle}` : ""}
              </p>
            </div>
          </Card>
        </Link>

        <Link to="/transportes/caronas" className="block">
          <Card className="p-3 flex items-center gap-3 hover:bg-muted/30 transition">
            <Car className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Caronas</p>
              <p className="text-[11px] text-muted-foreground">
                Divida o trajeto com outros que vão ao evento
              </p>
            </div>
          </Card>
        </Link>

        {mapsHref ? (
          <a href={mapsHref} target="_blank" rel="noreferrer" className="block">
            <Card className="p-3 flex items-center gap-3 hover:bg-muted/30 transition">
              <MapPin className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Como chegar</p>
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {mapsAddress}
                </p>
              </div>
            </Card>
          </a>
        ) : null}
      </div>
    </section>
  );
}
