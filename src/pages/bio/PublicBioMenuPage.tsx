/**
 * PublicBioMenuPage — /bio/:slug/menu (e fallback)
 *
 * Renderiza categorias e itens de Roxou Menu. Botão "Tenho interesse"
 * abre WhatsApp do estabelecimento. Suporta ?mesa=NN.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { trackBioEvent } from "@/lib/bioAnalytics";
import { getBioBySlug, listMenu, type BioProfile, type MenuCategory, type MenuItem } from "@/services/bio";
import { ArrowLeft, MessageCircle, Star } from "lucide-react";

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

  function interestHref(item: MenuItem): string | null {
    if (!bio?.whatsapp) return null;
    const phone = bio.whatsapp.replace(/\D/g, "");
    const mesaTxt = mesa ? ` (Mesa ${mesa})` : "";
    const text = encodeURIComponent(`Olá! Vi o item "${item.name}" no cardápio da Roxou Bio${mesaTxt}.`);
    return `https://wa.me/${phone}?text=${text}`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0d0518] text-white px-4 pt-8 pb-16">
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
    <main className="min-h-screen bg-gradient-to-b from-[#1a0b2e] via-[#0d0518] to-black text-white pb-20">
      <header className="sticky top-0 z-10 backdrop-blur bg-black/40 border-b border-white/10">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-3">
          <Link to={`/bio/${bio.slug}`} className="p-2 -ml-2 rounded-full hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <div className="text-sm text-white/60">Cardápio</div>
            <div className="font-semibold truncate">{bio.display_name}</div>
          </div>
          {mesa && (
            <span className="text-xs font-bold rounded-full px-2 py-1 bg-purple-500/30">Mesa {mesa}</span>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-8">
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
                {list.map((it) => (
                  <div key={it.id} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3 flex gap-3">
                    {it.image_url && (
                      <img src={it.image_url} alt={it.name} className="h-20 w-20 rounded-xl object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold truncate">{it.name}</span>
                        {it.is_featured && <Star className="h-3.5 w-3.5 text-yellow-300 fill-yellow-300" />}
                      </div>
                      {it.description && (
                        <p className="text-xs text-white/60 line-clamp-2">{it.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold text-white">{priceBRL(it.price)}</span>
                        {interestHref(it) && (
                          <a
                            href={interestHref(it)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                              trackBioEvent({
                                bio_id: bio.id,
                                event_type: "menu_item_click",
                                metadata: { item_id: it.id, mesa: mesa ?? undefined },
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-full bg-green-500/20 hover:bg-green-500/30 text-green-200 text-xs font-semibold px-3 py-1.5"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> Tenho interesse
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
