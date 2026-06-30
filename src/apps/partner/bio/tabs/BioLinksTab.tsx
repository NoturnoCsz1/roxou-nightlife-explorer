import { useEffect, useState } from "react";
import {
  Trash2,
  Plus,
  Copy,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Sparkles,
  Link as LinkIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  listLinksByBio,
  upsertLink,
  deleteLink,
  type BioProfile,
  type BioLink,
} from "@/services/bio";
import { autoIconFor, CTA_TEMPLATES } from "./shared";

export function BioLinksTab({ bio }: { bio: BioProfile }) {
  const [links, setLinks] = useState<BioLink[]>([]);
  const [draft, setDraft] = useState({ title: "", url: "", description: "" });
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      setLinks(await listLinksByBio(bio.id));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reload();
  }, [bio.id]);

  async function add() {
    if (!draft.title || !draft.url) {
      toast.error("Preencha título e URL");
      return;
    }
    await upsertLink({
      bio_id: bio.id,
      title: draft.title,
      url: draft.url,
      description: draft.description,
      position: links.length,
    });
    setDraft({ title: "", url: "", description: "" });
    await reload();
  }

  async function quick(t: (typeof CTA_TEMPLATES)[number]) {
    await upsertLink({
      bio_id: bio.id,
      title: t.title,
      url: t.url,
      description: t.description ?? null,
      position: links.length,
    });
    toast.success(`Adicionado: ${t.title}`);
    await reload();
  }

  async function toggle(l: BioLink) {
    await upsertLink({ ...l, is_active: !l.is_active });
    await reload();
  }
  async function duplicate(l: BioLink) {
    await upsertLink({
      bio_id: bio.id,
      title: `${l.title} (cópia)`,
      url: l.url,
      description: l.description ?? null,
      position: links.length,
    });
    await reload();
  }
  async function remove(id: string) {
    if (!confirm("Excluir este link?")) return;
    await deleteLink(id);
    await reload();
  }
  async function move(l: BioLink, dir: -1 | 1) {
    const idx = links.findIndex((x) => x.id === l.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= links.length) return;
    const other = links[swapIdx];
    await Promise.all([
      upsertLink({ ...l, position: other.position }),
      upsertLink({ ...other, position: l.position }),
    ]);
    await reload();
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4 space-y-3 bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-purple-500" /> CTAs prontos
        </div>
        <div className="flex flex-wrap gap-2">
          {CTA_TEMPLATES.map((t) => (
            <Button key={t.title} size="sm" variant="outline" onClick={() => quick(t)} className="gap-1">
              <t.icon className="h-3 w-3" />
              {t.title}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Adicionar link personalizado</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input placeholder="Título" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <Input placeholder="https://…" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
          <Input placeholder="Descrição (opcional)" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </div>
        <Button onClick={add} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </Card>

      {loading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : links.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
          Nenhum link ainda. Use os CTAs prontos acima ou crie um personalizado.
        </Card>
      ) : (
        <div className="space-y-2">
          {links.map((l, i) => {
            const Icon = autoIconFor(l.url);
            return (
              <Card key={l.id} className="p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, hsl(280 90% 60% / 0.2), hsl(330 90% 60% / 0.2))" }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium truncate ${l.is_active ? "" : "opacity-50 line-through"}`}>{l.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{l.url}</div>
                </div>
                <Badge variant="outline" className="hidden sm:inline-flex shrink-0">{l.click_count}</Badge>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => move(l, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" disabled={i === links.length - 1} onClick={() => move(l, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => toggle(l)}>
                    {l.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => duplicate(l)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(l.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
