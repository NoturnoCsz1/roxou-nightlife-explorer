/**
 * PublicBioMenuPage — /bio/:slug/menu (e fallback)
 *
 * Renderiza categorias e itens de Roxou Menu com faixas premium reutilizadas
 * da Onda 4: Destaques, Mais vendidos, Promoções e "Complete seu pedido"
 * (cross-sell simples). Botão "Tenho interesse" abre WhatsApp.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { trackBioEvent } from "@/lib/bioAnalytics";
import { getBioBySlug, listMenu, type BioProfile, type MenuCategory, type MenuItem } from "@/services/bio";
import {
  isPromoItem,
  loadMenuSalesMap,
  pickBestSellers,
  pickFeatured,
  pickPromos,
  suggestCrossSell,
} from "@/lib/bioMenuPremium";
import { ArrowLeft, MessageCircle, Star, Flame, Tag, Sparkles, Plus } from "lucide-react";

function priceBRL(v: number | null): string {
  if (v == null) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function PublicBioMenuPage() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const mesa = params.get("mesa");
  const [bio, setBio] = useState<BioProfile | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [salesMap, setSalesMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (!slug) return;
        const b = await getBioBySlug(slug);
        if (cancelled) return;
        if (!b || !b.show_menu) {
          setNotFound(true);
          return;
        }
        setBio(b);
        const { categories, items } = await listMenu(b.id, true);
        if (cancelled) return;
        setCategories(categories.filter((c) => c.is_active));
        setItems(items);
        trackBioEvent({ bio_id: b.id, event_type: "menu_view", metadata: mesa ? { mesa } : {} });
        loadMenuSalesMap(b.id)
          .then((m) => {
            if (!cancelled) setSalesMap(m);
          })
          .catch(() => {});
      } catch {
        setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug, mesa]);

  const grouped = useMemo(() => {
    const map = new Map<string | null, MenuItem[]>();
    for (const it of items) {
      const key = it.category_id ?? null;
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return map;
  }, [items]);

  const featured = useMemo(() => pickFeatured(items), [items]);
  const bestSellers = useMemo(() => pickBestSellers(items, salesMap), [items, salesMap]);
  const promos = useMemo(() => pickPromos(items), [items]);
  const completeYourOrder = useMemo(() => {
    // Pega um item-base (destaque ou mais vendido) e sugere a "outra ponta".
    const seed = featured[0] ?? bestSellers[0] ?? items.find((i) => i.is_available);
    if (!seed) return { seed: null as MenuItem | null, suggestions: [] as MenuItem[] };
    return { seed, suggestions: suggestCrossSell(seed, categories, items, 3) };
  }, [featured, bestSellers, items, categories]);

  function interestHref(item: MenuItem): string | null {
    if (!bio?.whatsapp) return null;
    const phone = bio.whatsapp.replace(/\D/g, "");
    const mesaTxt = mesa ? ` (Mesa ${mesa})` : "";
    const text = encodeURIComponent(`Olá! Vi o item "${item.name}" no cardápio da Roxou Bio${mesaTxt}.`);
    return `https://wa.me/${phone}?text=${text}`;
  }

  function handleItemClick(item: MenuItem) {
    if (!bio) return;
    trackBioEvent({
      bio_id: bio.id,
      event_type: "menu_item_click",
      metadata: { item_id: item.id, mesa: mesa ?? undefined },
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0d0518] text-white px-4 pt-8 pb-16 overflow-x-hidden">
        <div className="max-w-md mx-auto space-y-3">
          <Skeleton className="h-10 w-2/3 bg-white/5" />
          <Skeleton className="h-24 w-full bg-white/5 rounded-2xl" />
          <Skeleton className="h-24 w-full bg-white/5 rounded-2xl" />
        </div>
      </main>
    );
  }

  if (notFound || !bio) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Cardápio indisponível</h1>
          <Link to={`/bio/${slug ?? ""}`} className="text-purple-300 underline">Voltar para a bio</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#1a0b2e] via-[#0d0518] to-black text-white pb-20 overflow-x-hidden">
      <header className="sticky top-0 z-10 backdrop-blur bg-black/40 border-b border-white/10">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-3">
          <Link to={`/bio/${bio.slug}`} className="p-2 -ml-2 rounded-full hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white/60">Cardápio</div>
            <div className="font-semibold truncate">{bio.display_name}</div>
          </div>
          {mesa && (
            <span className="text-xs font-bold rounded-full px-2 py-1 bg-purple-500/30 shrink-0">Mesa {mesa}</span>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-8">
        {/* Faixas premium (somente se houver dados) */}
        {featured.length > 0 && (
          <PremiumRow
            title="Destaques"
            icon={Sparkles}
            items={featured}
            onClick={handleItemClick}
            interestHref={interestHref}
            badgeColor="from-purple-500/30 to-fuchsia-500/20"
          />
        )}
        {bestSellers.length > 0 && (
          <PremiumRow
            title="Mais vendidos"
            icon={Flame}
            items={bestSellers}
            onClick={handleItemClick}
            interestHref={interestHref}
            badgeColor="from-orange-500/30 to-pink-500/20"
          />
        )}
        {promos.length > 0 && (
          <PremiumRow
            title="Promoções"
            icon={Tag}
            items={promos}
            onClick={handleItemClick}
            interestHref={interestHref}
            badgeColor="from-amber-500/30 to-orange-500/20"
          />
        )}

        {completeYourOrder.seed && completeYourOrder.suggestions.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="h-4 w-4 text-purple-300" />
              <h2 className="text-sm font-bold">Complete seu pedido</h2>
            </div>
            <p className="text-[11px] text-white/60 mb-3 truncate">
              Combina com <strong className="text-white/80">{completeYourOrder.seed.name}</strong>
            </p>
            <div className="flex gap-2 overflow-x-auto -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
              {completeYourOrder.suggestions.map((it) => (
                <button
                  key={it.id}
                  onClick={() => {
                    handleItemClick(it);
                    const href = interestHref(it);
                    if (href) window.open(href, "_blank", "noopener,noreferrer");
                  }}
                  className="snap-start shrink-0 w-32 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 p-2 text-left transition-colors"
                >
                  {it.image_url ? (
                    <img
                      src={it.image_url}
                      alt={it.name}
                      loading="lazy"
                      decoding="async"
                      className="h-20 w-full rounded-lg object-cover mb-1"
                    />
                  ) : (
                    <div className="h-20 w-full rounded-lg bg-white/5 mb-1" />
                  )}
                  <div className="text-xs font-semibold truncate">{it.name}</div>
                  <div className="text-[11px] text-purple-200">{priceBRL(it.price)}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {categories.length === 0 && items.length === 0 && (
          <p className="text-center text-white/60 py-12">Nenhum item disponível no momento.</p>
        )}

        {[...categories, null].map((cat) => {
          const list = grouped.get(cat?.id ?? null) ?? [];
          if (list.length === 0) return null;
          return (
            <section key={cat?.id ?? "_uncat"}>
              <h2 className="text-lg font-bold mb-3">{cat?.name ?? "Outros"}</h2>
              <div className="space-y-3">
                {list.map((it) => {
                  const sold = salesMap.get(it.id) ?? 0;
                  const promo = isPromoItem(it);
                  return (
                    <div key={it.id} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3 flex gap-3">
                      {it.image_url && (
                        <img
                          src={it.image_url}
                          alt={it.name}
                          loading="lazy"
                          decoding="async"
                          className="h-20 w-20 rounded-xl object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-semibold truncate">{it.name}</span>
                          {it.is_featured && <Star className="h-3.5 w-3.5 text-yellow-300 fill-yellow-300 shrink-0" />}
                          {promo && (
                            <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 bg-orange-500/20 text-orange-200 border border-orange-400/30">
                              Promo
                            </span>
                          )}
                          {sold > 0 && (
                            <span className="text-[10px] rounded-full px-1.5 py-0.5 bg-white/10 text-white/70 inline-flex items-center gap-0.5">
                              <Flame className="h-2.5 w-2.5" />{sold}
                            </span>
                          )}
                        </div>
                        {it.description && (
                          <p className="text-xs text-white/60 line-clamp-2">{it.description}</p>
                        )}
                        <div className="flex items-center justify-between gap-2 mt-2">
                          <span className="text-sm font-bold text-white">{priceBRL(it.price)}</span>
                          {interestHref(it) && (
                            <a
                              href={interestHref(it)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleItemClick(it)}
                              className="inline-flex items-center gap-1 rounded-full bg-green-500/20 hover:bg-green-500/30 text-green-200 text-xs font-semibold px-3 py-1.5 shrink-0"
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> Tenho interesse
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function PremiumRow({
  title,
  icon: Icon,
  items,
  onClick,
  interestHref,
  badgeColor,
}: {
  title: string;
  icon: typeof Sparkles;
  items: MenuItem[];
  onClick: (i: MenuItem) => void;
  interestHref: (i: MenuItem) => string | null;
  badgeColor: string;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-br ${badgeColor}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-base font-bold">{title}</h2>
        <span className="text-[11px] text-white/50">· {items.length}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
        {items.map((it) => {
          const href = interestHref(it);
          return (
            <a
              key={it.id}
              href={href ?? "#"}
              target={href ? "_blank" : undefined}
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!href) e.preventDefault();
                onClick(it);
              }}
              className="snap-start shrink-0 w-40 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 overflow-hidden transition-colors"
            >
              {it.image_url ? (
                <img
                  src={it.image_url}
                  alt={it.name}
                  loading="lazy"
                  decoding="async"
                  className="h-24 w-full object-cover"
                />
              ) : (
                <div className="h-24 w-full bg-gradient-to-br from-white/5 to-white/0" />
              )}
              <div className="p-2">
                <div className="text-xs font-semibold truncate">{it.name}</div>
                <div className="text-[11px] font-bold text-purple-200 mt-0.5">{priceBRL(it.price)}</div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
