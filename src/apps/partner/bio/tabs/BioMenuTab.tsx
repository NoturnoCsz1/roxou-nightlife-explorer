/**
 * BioMenuTab — Cardápio premium (sem novas tabelas).
 *
 * Mantém todo o CRUD original (categorias + itens + edição inline)
 * e acrescenta seções derivadas em tempo real:
 *  - Destaque: itens com is_featured.
 *  - Mais vendidos: ranking via bio_analytics_events (event_type "menu_item_click").
 *  - Promoções: heurística por keywords na descrição.
 *  - Cross-sell: pares de categorias Comida ↔ Bebidas no editor (preview).
 */
import { useEffect, useMemo, useState } from "react";
import { Trash2, Plus, Search, Utensils, Sparkles, Flame, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listMenu,
  upsertCategory,
  deleteCategory,
  upsertItem,
  deleteItem,
  type BioProfile,
  type MenuCategory,
  type MenuItem,
} from "@/services/bio";
import { fmtBRL } from "./shared";

const PROMO_KEYWORDS = ["promo", "promoção", "promocao", "oferta", "desconto", "combo"];

function isPromo(it: MenuItem): boolean {
  const text = `${it.name} ${it.description ?? ""}`.toLowerCase();
  return PROMO_KEYWORDS.some((k) => text.includes(k));
}

function crossSellTargetFor(cat: MenuCategory | undefined): string | null {
  if (!cat) return null;
  const n = cat.name.toLowerCase();
  if (/(comida|prato|lanche|porç|porc|burger|pizza)/.test(n)) return "bebida";
  if (/(bebida|drink|chopp|cerveja|suco|refri)/.test(n)) return "comida";
  return null;
}

export function BioMenuTab({ bio }: { bio: BioProfile }) {
  const [cats, setCats] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [salesMap, setSalesMap] = useState<Map<string, number>>(new Map());
  const [newCat, setNewCat] = useState("");
  const [newItem, setNewItem] = useState({ name: "", price: "", category_id: "", image_url: "", description: "" });
  const [search, setSearch] = useState("");

  async function reload() {
    const { categories, items } = await listMenu(bio.id);
    setCats(categories);
    setItems(items);
  }

  // Ranking "Mais vendidos" derivado de eventos de clique no item.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await supabase
        .from("bio_analytics_events" as never)
        .select("metadata, event_type, created_at")
        .eq("bio_id", bio.id)
        .eq("event_type", "menu_item_click")
        .gte("created_at", since);
      if (cancelled) return;
      const map = new Map<string, number>();
      for (const r of (data as Array<{ metadata: Record<string, unknown> | null }>) ?? []) {
        const id = (r.metadata?.item_id as string | undefined) ?? null;
        if (!id) continue;
        map.set(id, (map.get(id) ?? 0) + 1);
      }
      setSalesMap(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [bio.id]);

  useEffect(() => {
    reload();
  }, [bio.id]);

  async function addCat() {
    if (!newCat) return;
    await upsertCategory({ bio_id: bio.id, name: newCat, position: cats.length });
    setNewCat("");
    await reload();
  }
  async function addItem() {
    if (!newItem.name) {
      toast.error("Informe o nome");
      return;
    }
    await upsertItem({
      bio_id: bio.id,
      name: newItem.name,
      price: newItem.price ? Number(newItem.price) : null,
      category_id: newItem.category_id || null,
      image_url: newItem.image_url || null,
      description: newItem.description || null,
      position: items.length,
    });
    setNewItem({ name: "", price: "", category_id: "", image_url: "", description: "" });
    await reload();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q));
  }, [items, search]);

  const featured = useMemo(() => items.filter((i) => i.is_featured && i.is_available), [items]);
  const bestSellers = useMemo(() => {
    if (salesMap.size === 0) return [];
    return items
      .filter((i) => i.is_available && salesMap.has(i.id))
      .sort((a, b) => (salesMap.get(b.id) ?? 0) - (salesMap.get(a.id) ?? 0))
      .slice(0, 6);
  }, [items, salesMap]);
  const promos = useMemo(() => items.filter((i) => i.is_available && isPromo(i)).slice(0, 6), [items]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* === Seções premium (apenas leitura) === */}
      {(featured.length > 0 || bestSellers.length > 0 || promos.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PremiumStrip
            title="Destaque"
            icon={Sparkles}
            color="from-purple-500/20 to-fuchsia-500/10"
            items={featured}
          />
          <PremiumStrip
            title="Mais vendidos"
            icon={Flame}
            color="from-orange-500/20 to-pink-500/10"
            items={bestSellers}
            hint={salesMap.size === 0 ? "Sem cliques registrados ainda." : undefined}
          />
          <PremiumStrip
            title="Promoções"
            icon={Tag}
            color="from-amber-500/20 to-orange-500/10"
            items={promos}
            hint={promos.length === 0 ? "Marque palavras como 'promo' ou 'oferta' na descrição." : undefined}
          />
        </div>
      )}

      <Card className="p-4 space-y-2">
        <h3 className="text-sm font-semibold">Categorias</h3>
        <div className="flex gap-2">
          <Input placeholder="Ex: Bebidas, Porções, Lanches…" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <Button onClick={addCat} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs">
              <span className={c.is_active ? "" : "opacity-50 line-through"}>{c.name}</span>
              <Switch
                checked={c.is_active}
                onCheckedChange={async (v) => {
                  await upsertCategory({ ...c, is_active: v });
                  await reload();
                }}
              />
              <button
                className="text-muted-foreground hover:text-destructive"
                onClick={async () => {
                  if (!confirm(`Excluir "${c.name}"?`)) return;
                  await deleteCategory(c.id);
                  await reload();
                }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {cats.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma categoria ainda.</span>}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Adicionar item</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="Nome" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
          <Input placeholder="Preço (R$)" type="number" step="0.01" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} />
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={newItem.category_id}
            onChange={(e) => setNewItem({ ...newItem, category_id: e.target.value })}
          >
            <option value="">Sem categoria</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Input placeholder="Imagem (URL)" value={newItem.image_url} onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })} />
          <Input className="sm:col-span-2" placeholder="Descrição (use 'promo' ou 'oferta' para marcar promoção)" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
        </div>
        {(() => {
          const cat = cats.find((c) => c.id === newItem.category_id);
          const target = crossSellTargetFor(cat);
          if (!target) return null;
          return (
            <p className="text-[11px] text-muted-foreground">
              💡 Cross-sell: itens dessa categoria combinam com <strong>{target === "bebida" ? "Bebidas" : "Comidas"}</strong>. O cardápio público sugere automaticamente.
            </p>
          );
        })()}
        <Button onClick={addItem} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar item…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2">
        {filtered.map((it) => {
          const cat = cats.find((c) => c.id === it.category_id);
          const sold = salesMap.get(it.id) ?? 0;
          return (
            <Card key={it.id} className="p-3 flex gap-3 items-center hover:bg-muted/30 transition-colors">
              {it.image_url ? (
                <img
                  src={it.image_url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-16 w-16 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Utensils className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{it.name}</span>
                  {it.is_featured && <Badge variant="secondary" className="text-[10px]">Destaque</Badge>}
                  {isPromo(it) && <Badge className="text-[10px] bg-orange-500/15 text-orange-500 border-orange-500/30">Promo</Badge>}
                  {sold > 0 && <Badge variant="outline" className="text-[10px]"><Flame className="h-2.5 w-2.5 mr-0.5" />{sold}</Badge>}
                  {!it.is_available && <Badge variant="destructive" className="text-[10px]">Indisponível</Badge>}
                </div>
                {it.description && <div className="text-xs text-muted-foreground line-clamp-2">{it.description}</div>}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-semibold text-purple-500">{fmtBRL(it.price)}</span>
                  {cat && <span className="text-[10px] text-muted-foreground">· {cat.name}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Switch
                  checked={it.is_featured}
                  onCheckedChange={async (v) => {
                    await upsertItem({ ...it, is_featured: v });
                    await reload();
                  }}
                  aria-label="Destacar"
                />
                <Switch
                  checked={it.is_available}
                  onCheckedChange={async (v) => {
                    await upsertItem({ ...it, is_available: v });
                    await reload();
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={async () => {
                    if (!confirm(`Excluir "${it.name}"?`)) return;
                    await deleteItem(it.id);
                    await reload();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <Utensils className="h-8 w-8 mx-auto mb-2 opacity-30" />
            {search ? "Nada encontrado." : "Nenhum item ainda."}
          </Card>
        )}
      </div>
    </div>
  );
}

function PremiumStrip({
  title,
  icon: Icon,
  color,
  items,
  hint,
}: {
  title: string;
  icon: typeof Sparkles;
  color: string;
  items: MenuItem[];
  hint?: string;
}) {
  return (
    <Card className={`p-3 bg-gradient-to-br ${color} border-border/50`}>
      <div className="flex items-center gap-2 text-sm font-semibold mb-2">
        <Icon className="h-4 w-4" /> {title}
        <Badge variant="outline" className="ml-auto text-[10px]">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">{hint ?? "Sem itens."}</p>
      ) : (
        <ul className="space-y-1 text-xs">
          {items.slice(0, 4).map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-2">
              <span className="truncate">{i.name}</span>
              <span className="text-muted-foreground tabular-nums shrink-0">{fmtBRL(i.price)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
