import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, BadgePercent, Beer, Car, ExternalLink, Flame, MessageCircle, PiggyBank, Sparkles, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function V3Economize() {
  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["promotion-opportunities"],
    queryFn: async () => {
      const { data } = await supabase.from("promotion_opportunities" as any).select("*, partners(name,slug,logo_url)").order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(30);
      return (data as any[]) || [];
    },
  });

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/v3" className="rounded-full p-2 v3-glass"><ArrowLeft className="h-5 w-5 text-muted-foreground" /></Link>
        <div>
          <h1 className="font-display text-2xl font-black text-foreground">Economize</h1>
          <p className="text-xs text-muted-foreground">Oportunidades, afiliados e promoções priorizadas pela IA.</p>
        </div>
      </div>

      <div className="rounded-3xl v3-glass-strong v3-pulse-glow p-5 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-primary/10 to-transparent" />
        <div className="relative flex items-start gap-3">
          <PiggyBank className="h-8 w-8 text-accent" />
          <div>
            <h2 className="font-display text-xl font-black text-foreground">Dica de Ouro</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">A IA destaca parceiros que pagam para aparecer e ofertas úteis para você decidir o rolê gastando menos.</p>
          </div>
        </div>
      </div>

      {isLoading ? <div className="rounded-3xl v3-skeleton h-32" /> : opportunities.length > 0 ? (
        <div className="space-y-3">
          {opportunities.map((op: any) => (
            <article key={op.id} className={`rounded-3xl v3-glass p-4 overflow-hidden ${op.featured ? "v3-pulse-glow" : ""}`}>
              <div className="flex gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-secondary flex items-center justify-center">
                  {op.image_url || op.partners?.logo_url ? <img src={op.image_url || op.partners.logo_url} alt={op.title} className="h-full w-full object-cover" /> : <BadgePercent className="h-7 w-7 text-primary" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    {op.featured && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-black text-primary"><Flame className="mr-1 inline h-2.5 w-2.5" /> Destaque IA</span>}
                  </div>
                  <h2 className="font-display text-base font-black text-foreground line-clamp-2">{op.title}</h2>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">{op.description}</p>
                  {op.offer_text && <p className="mt-2 rounded-xl bg-accent/10 px-3 py-2 text-[11px] font-bold text-accent">{op.offer_text}</p>}
                </div>
              </div>
              {op.affiliate_url && (
                <Button asChild className="mt-3 w-full rounded-2xl h-11 font-black">
                  <a href={op.affiliate_url} target="_blank" rel="noopener noreferrer">Aproveitar oportunidade <ExternalLink className="h-4 w-4" /></a>
                </Button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl v3-glass p-8 text-center">
          <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-bold text-foreground">Nenhuma oportunidade ativa agora</p>
          <p className="mt-1 text-xs text-muted-foreground">Volte em breve para ofertas de parceiros ROXOU.</p>
        </div>
      )}
    </div>
  );
}
