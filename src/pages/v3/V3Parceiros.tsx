import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Instagram, MapPin, ArrowRight, Star } from "lucide-react";
import { ADMIN_PARTNER_TYPE_OPTIONS } from "@/lib/categoryConfig";

type Partner = {
  id: string;
  name: string;
  slug: string;
  type: string;
  city: string;
  logo_url: string | null;
  short_description: string | null;
  instagram: string | null;
  verified_partner: boolean;
  featured_home: boolean;
};

const typeLabel = (t: string) =>
  ADMIN_PARTNER_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;

export default function V3Parceiros() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("partners")
        .select("id,name,slug,type,city,logo_url,short_description,instagram,verified_partner,featured_home")
        .eq("active", true)
        .order("featured_home", { ascending: false })
        .order("verified_partner", { ascending: false })
        .order("name", { ascending: true });
      setPartners((data as Partner[]) || []);
      setLoading(false);
    })();
  }, []);

  const featured = partners.filter((p) => p.featured_home);
  const spotlight = featured[0];
  const others = partners.filter((p) => p.id !== spotlight?.id);

  return (
    <div className="v3-theme min-h-screen text-foreground">
      {/* Hero */}
      <section className="px-4 pt-6 pb-3">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" /> Parceiros Roxou
        </div>
        <h1 className="mt-2 font-display text-2xl font-black leading-tight">
          Os lugares que <span className="text-primary v3-neon-text">fazem o rolê</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bares, baladas, restaurantes e produtoras parceiras com benefícios exclusivos.
        </p>
      </section>

      {/* Destaque do mês */}
      {spotlight && (
        <section className="px-4 mb-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <Star className="h-3 w-3 text-primary" /> Destaque do mês
          </div>
          <Link
            to={`/local/${spotlight.slug}`}
            className="group relative block overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 via-background to-background p-5 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.5)] transition hover:shadow-[0_0_60px_-10px_hsl(var(--primary)/0.7)]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.25),transparent_60%)]" />
            <div className="relative flex items-center gap-4">
              <div className="h-20 w-20 flex-none rounded-xl bg-card/80 ring-1 ring-white/10 overflow-hidden flex items-center justify-center">
                {spotlight.logo_url ? (
                  <img src={spotlight.logo_url} alt={spotlight.name} fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-primary">{spotlight.name[0]}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  {typeLabel(spotlight.type)}
                </div>
                <div className="font-display text-lg font-black truncate">{spotlight.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {spotlight.short_description || `Parceiro destaque em ${spotlight.city}`}
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-primary flex-none transition group-hover:translate-x-1" />
            </div>
          </Link>
        </section>
      )}

      {/* Grid */}
      <section className="px-4 pb-24">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Todos os parceiros
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : others.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            Nenhum parceiro ainda. Volte em breve.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {others.map((p) => (
              <Link
                key={p.id}
                to={`/local/${p.slug}`}
                onClick={() => import("@/lib/ga").then(m => m.trackPartnerClick(p.id, p.name))}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/60 backdrop-blur-sm p-3 transition hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.6)]"
              >
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-background/50 ring-1 ring-white/5 mb-2 flex items-center justify-center">
                  {p.logo_url ? (
                    <img
                      src={p.logo_url}
                      alt={p.name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-3xl font-black text-primary/60">{p.name[0]}</span>
                  )}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-primary">
                  {typeLabel(p.type)}
                </div>
                <div className="text-sm font-bold leading-tight truncate">{p.name}</div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                  <MapPin className="h-2.5 w-2.5" /> {p.city}
                </div>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-[10px] font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
                    Ver promoções <ArrowRight className="h-2.5 w-2.5" />
                  </span>
                  {p.instagram && (
                    <Instagram className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
