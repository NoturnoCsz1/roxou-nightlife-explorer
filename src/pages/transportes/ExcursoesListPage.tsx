/**
 * ExcursoesListPage — Fase 7.3
 *
 * Lista pública de excursões oficiais (status=open, is_public=true).
 * Sem filtro por cidade nesta etapa — apenas próximas viagens disponíveis.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BusFront, CalendarClock, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface TripRow {
  id: string;
  public_slug: string;
  title: string;
  destination: string | null;
  departure_at: string;
  price_cents: number;
  partner_id: string;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatBRL(cents: number): string {
  if (cents <= 0) return "Grátis";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function ExcursoesListPage() {
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Excursões Oficiais · Roxou";
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Lê apenas viagens públicas abertas via view proxy `public_excursion_trips`.
      // A view expõe apenas colunas seguras e filtra internamente is_public/status/data,
      // então anon nunca toca a tabela base excursion_trips.
      const { data } = await supabase
        // View pública ainda não aparece nos tipos gerados; cast pontual.
        .from("public_excursion_trips" as never)
        .select(
          "id, public_slug, title, destination, departure_at, price_cents, partner_id",
        )
        .order("departure_at", { ascending: true })
        .limit(20);
      if (!alive) return;
      setTrips(((data ?? []) as unknown) as TripRow[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main
      className="min-h-screen w-full"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto w-full max-w-md px-4 py-4 space-y-4">
        <Link
          to="/transportes"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Transporte
        </Link>

        <header className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-primary">
            🚍 Roxou Transportes
          </p>
          <h1 className="text-2xl font-bold">Excursões Oficiais</h1>
          <p className="text-xs text-muted-foreground">
            Viaje com segurança e embarque por QR Code.
          </p>
        </header>

        {loading ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Carregando viagens…
          </Card>
        ) : trips.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground space-y-1">
            <BusFront className="h-6 w-6 mx-auto text-muted-foreground" />
            <p>Nenhuma excursão pública disponível no momento.</p>
            <p className="text-[11px]">
              Volte em breve — novos roteiros saem toda semana.
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {trips.map((t) => (
              <li key={t.id}>
                <Link to={`/transportes/excursoes/${t.public_slug}`}>
                  <Card className="p-4 space-y-2 hover:border-primary/40 transition">
                    <p className="font-semibold leading-snug">{t.title}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {formatDateTime(t.departure_at)}
                    </div>
                    {t.destination ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {t.destination}
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] uppercase tracking-wide text-emerald-400">
                        Vagas abertas
                      </span>
                      <span className="text-sm font-bold text-primary">
                        {formatBRL(t.price_cents)}
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
