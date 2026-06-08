import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Star, Instagram } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

interface Partner {
  id: string;
  name: string;
  slug: string;
  type: string;
  city: string;
  neighborhood: string | null;
  short_description: string | null;
  logo_url: string | null;
  instagram: string | null;
  verified_partner: boolean;
}

const typeFilters = [
  { label: "Todos", value: "" },
  { label: "🍔 Lanches", value: "lanche" },
  { label: "🍺 Cerveja", value: "bar" },
  { label: "🍽️ Restaurantes", value: "restaurante" },
  { label: "🌙 Pós Rolê", value: "pos_role" },
];

/* Map DB type values to display labels */
const typeLabels: Record<string, string> = {
  bar: "Bar / Cerveja",
  restaurante: "Restaurante",
  lanche: "Lanches",
  balada: "Balada",
  casa_show: "Casa de Show",
  pos_role: "Pós Rolê",
};

const Indica = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("");

  useEffect(() => {
    loadPartners();
  }, []);

  async function loadPartners() {
    setLoading(true);
    const { data } = await supabase
      .from("partners")
      .select("id, name, slug, type, city, neighborhood, short_description, logo_url, instagram, verified_partner")
      .eq("active", true)
      .order("name");
    setPartners(data || []);
    setLoading(false);
  }

  const filtered = activeFilter
    ? partners.filter(p => p.type === activeFilter)
    : partners;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <SEO title="Roxou Indica | Melhores lugares" description="Descubra os melhores bares, restaurantes e lanchonetes indicados pelo Roxou." />
      <DesktopNav />

      <div className="mx-auto max-w-5xl px-3 pt-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Star className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Roxou Indica</h1>
            <p className="text-[10px] text-muted-foreground">Os melhores lugares da cidade</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {typeFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                activeFilter === f.value
                  ? "gradient-primary text-primary-foreground neon-glow"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-2xl border border-border/40 bg-card h-32 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border/40 bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum local encontrado nesta categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(partner => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}
          </div>
        )}
      </div>

      <Footer />
      <BottomNav />
    </div>
  );
};

function PartnerCard({ partner }: { partner: Partner }) {
  const typeLabel = typeLabels[partner.type] || partner.type;

  return (
    <a
      href={`/local/${partner.slug}`}
      className="group rounded-2xl border border-border/40 bg-card p-4 flex gap-3 hover:border-primary/30 hover:shadow-[0_0_20px_hsl(var(--primary)/0.08)] transition-all duration-200"
    >
      {/* Logo */}
      <PartnerLogo src={partner.logo_url} alt={partner.name} size="md" rounded="xl" interactive />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
            {partner.name}
          </h3>
          {partner.verified_partner && (
            <Star className="h-3 w-3 text-primary shrink-0 fill-primary" />
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
            {typeLabel}
          </span>
          {partner.neighborhood && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5" /> {partner.neighborhood}
            </span>
          )}
        </div>

        {partner.short_description && (
          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {partner.short_description}
          </p>
        )}

        {partner.instagram && (
          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5 mt-1">
            <Instagram className="h-2.5 w-2.5" /> @{partner.instagram.replace("@", "")}
          </span>
        )}
      </div>
    </a>
  );
}

export default Indica;
