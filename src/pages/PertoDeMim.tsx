import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Crosshair, Calendar, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import RoxouNearbyEventsMap, { type NearbyEvent } from "@/components/maps/RoxouNearbyEventsMap";
import { haversineKm, type LatLng } from "@/lib/geoUtils";
import SEO from "@/components/SEO";

const PP_FALLBACK: LatLng = { lat: -22.1207, lng: -51.3889 };

export default function PertoDeMim() {
  const navigate = useNavigate();
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [events, setEvents] = useState<NearbyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoDenied, setGeoDenied] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) { setGeoDenied(true); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { setGeoDenied(true); toast.message("Localização não disponível, mostrando rolês de Presidente Prudente."); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const now = new Date().toISOString();
      const { data: evts } = await supabase
        .from("events")
        .select("id,title,slug,venue_name,date_time,latitude,longitude,partner_id,status")
        .eq("status", "published")
        .gt("date_time", now)
        .order("date_time", { ascending: true })
        .limit(150);

      const list = evts || [];
      const partnerIds = [...new Set(list.filter(e => e.partner_id && (e.latitude == null || e.longitude == null)).map(e => e.partner_id!))];
      let partnerMap: Record<string, { lat: number | null; lng: number | null }> = {};
      if (partnerIds.length > 0) {
        const { data: ps } = await supabase.from("partners").select("id,latitude,longitude").in("id", partnerIds);
        (ps || []).forEach(p => { partnerMap[p.id] = { lat: (p as any).latitude, lng: (p as any).longitude }; });
      }

      const mapped: NearbyEvent[] = list
        .map(e => {
          const lat = e.latitude ?? (e.partner_id ? partnerMap[e.partner_id]?.lat : null);
          const lng = e.longitude ?? (e.partner_id ? partnerMap[e.partner_id]?.lng : null);
          if (lat == null || lng == null) return null;
          return { id: e.id, title: e.title, slug: e.slug, venue_name: e.venue_name, date_time: e.date_time, lat, lng } as NearbyEvent;
        })
        .filter(Boolean) as NearbyEvent[];

      setEvents(mapped);
      setLoading(false);
    })();
  }, []);

  const center = userLoc || (geoDenied ? PP_FALLBACK : null);
  const sorted = center
    ? [...events].map(e => ({ e, d: haversineKm(center, { lat: e.lat, lng: e.lng }) })).sort((a, b) => a.d - b.d).slice(0, 30)
    : events.slice(0, 30).map(e => ({ e, d: 0 }));

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO title="Rolês perto de você | ROXOU" description="Encontre eventos, festas e shows próximos da sua localização." canonical="https://roxou.com.br/perto-de-mim" />

      <header className="sticky top-0 z-40 glass border-b border-border/30">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2 rounded-xl hover:bg-card"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
          <div>
            <h1 className="font-display font-bold text-lg">Rolês perto de você</h1>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {userLoc ? "Sua localização" : "Presidente Prudente"}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4 space-y-4">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Carregando rolês...</p>
        ) : (
          <>
            <RoxouNearbyEventsMap userLocation={center} events={sorted.map(s => s.e)} height={340} heatmap />

            {geoDenied && (
              <Button
                variant="outline"
                className="w-full rounded-xl gap-2"
                onClick={() => {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => { setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoDenied(false); },
                    () => toast.error("Permissão negada")
                  );
                }}
              >
                <Crosshair className="w-4 h-4" /> Usar minha localização
              </Button>
            )}

            <section className="space-y-2">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mt-2">
                <Calendar className="w-3.5 h-3.5" /> Próximos {sorted.length} rolês
              </h2>
              {sorted.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhum evento com localização cadastrada.</p>
              )}
              {sorted.map(({ e, d }) => (
                <div key={e.id} className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-md p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display font-bold text-sm truncate">{e.title}</p>
                      {e.venue_name && <p className="text-[11px] text-muted-foreground truncate">{e.venue_name}</p>}
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(e.date_time).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                    {center && (
                      <span className="text-[10px] rounded-lg bg-primary/10 border border-primary/30 px-2 py-1 text-primary font-semibold whitespace-nowrap">
                        {d.toFixed(1)} km
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" className="rounded-lg text-[11px] h-8" onClick={() => navigate(e.slug ? `/evento/${e.slug}` : `/evento/${e.id}`)}>Ver</Button>
                    <Button size="sm" variant="outline" className="rounded-lg text-[11px] h-8" onClick={() => navigate(`/pedir-carona?eventId=${e.id}`)}>Carona</Button>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-border/40 text-[11px] font-medium h-8 hover:border-primary/40"
                    >
                      <Navigation className="w-3 h-3" /> Ir
                    </a>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
