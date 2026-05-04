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

      {/* Hero — Dica de Ouro */}
      <div className="rounded-3xl v3-glass-strong v3-pulse-glow p-5 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-primary/10 to-transparent" />
        <div className="relative flex items-start gap-3">
          <PiggyBank className="h-8 w-8 text-accent" />
          <div>
            <h2 className="font-display text-xl font-black text-foreground">Dica de Ouro</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">A Aura destaca parceiros e ofertas úteis pra você curtir o rolê gastando menos. 💜</p>
          </div>
        </div>
      </div>

      {/* Card Destaque — Transporte Seguro */}
      <Link
        to="/v3/transporte"
        className="group relative block overflow-hidden rounded-3xl v3-glass-strong border border-primary/30 p-5 transition hover:border-primary/60 hover:shadow-[0_0_28px_hsl(var(--v3-neon)/0.3)]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-accent/10 to-transparent" />
        <div className="relative flex items-start gap-4">
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Car className="h-6 w-6 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.8)]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Economize no rolê</span>
            <h3 className="mt-1 font-display text-lg font-black text-foreground">Transporte Seguro</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Agende sua corrida direto com motoristas verificados ROXOU. Mais barato que app e sem surpresa.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-primary group-hover:gap-2 transition-all">
              Agendar carona <ExternalLink className="h-3 w-3" />
            </span>
          </div>
        </div>
      </Link>

      {/* Aura Indica Promo — destaque do dia */}
      <AuraIndicaPromo />


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

      {/* CTA Parceiros */}
      <a
        href="https://wa.me/5518991234567?text=Ol%C3%A1%21%20Sou%20dono%20de%20bar%20e%20quero%20anunciar%20uma%20promo%C3%A7%C3%A3o%20no%20ROXOU."
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/15 via-primary/10 to-background p-5 transition hover:border-accent/60 hover:shadow-[0_0_28px_hsl(var(--accent)/0.25)]"
      >
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-accent/20 flex items-center justify-center">
            <Store className="h-6 w-6 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-accent">Parceiros ROXOU</span>
            <h3 className="mt-1 font-display text-base font-black text-foreground">É dono de bar?</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Anuncie sua promoção aqui e apareça para milhares de universitários de Prudente.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-accent group-hover:gap-2 transition-all">
              <MessageCircle className="h-3.5 w-3.5" /> Falar com a equipe
            </span>
          </div>
        </div>
      </a>
    </div>
  );
}

function AuraIndicaPromo() {
  const { data: promo, isLoading } = useQuery({
    queryKey: ["aura-indica-promo-today"],
    queryFn: async () => {
      const { data } = await supabase
        .from("promotion_opportunities" as any)
        .select("*, partners(name,slug)")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
  });

  if (isLoading || !promo) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-background/40 backdrop-blur-md p-4">
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/15 flex items-center justify-center">
          <Beer className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">💜 Aura Indica · Promo do dia</span>
          <p className="mt-0.5 text-sm font-bold text-foreground line-clamp-1">
            {promo.offer_text || promo.title}
          </p>
          {promo.partners?.name && (
            <p className="text-[10.5px] text-muted-foreground line-clamp-1">no <strong className="text-foreground/90">{promo.partners.name}</strong></p>
          )}
        </div>
        {promo.affiliate_url && (
          <a
            href={promo.affiliate_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full bg-primary/90 px-3 py-1.5 text-[10px] font-black text-primary-foreground hover:bg-primary transition"
          >
            Ver
          </a>
        )}
      </div>
    </div>
  );
}
