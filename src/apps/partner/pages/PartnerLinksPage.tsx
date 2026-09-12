/**
 * PartnerLinksPage — interface do Partner Pro sobre o Encurtador de Links
 * Roxou (roxou.click) oficial. Cliques exibidos são os reais da tabela.
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Link2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PartnerScreen } from "../components/PartnerScreen";
import { usePartnerSessionContext } from "../contexts/PartnerSessionContext";
import {
  createShortLink,
  listMyShortLinks,
  setShortLinkActive,
  shortLinkUrl,
  type OfficialShortLink,
} from "@modules/partner/growth/converged/shortLinksOfficialService";

const PartnerLinksPage = () => {
  const { session, isLoading: sessionLoading } = usePartnerSessionContext();
  const userId = session?.userId ?? null;

  const [links, setLinks] = useState<OfficialShortLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [target, setTarget] = useState("");
  const [campaign, setCampaign] = useState("");

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setLinks(await listMyShortLinks(userId));
    } catch (err) {
      toast.error("Não foi possível carregar os links", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      await createShortLink(
        { title, slug, target_url: target, utm_campaign: campaign || null },
        userId,
      );
      toast.success("Link criado.");
      setCreating(false);
      setTitle("");
      setSlug("");
      setTarget("");
      setCampaign("");
      await refresh();
    } catch (err) {
      toast.error("Não foi possível criar o link", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (link: OfficialShortLink) => {
    if (!userId) return;
    try {
      await setShortLinkActive(link.id, userId, !link.is_active);
      await refresh();
    } catch (err) {
      toast.error("Não foi possível alterar o link", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const copy = async (link: OfficialShortLink) => {
    await navigator.clipboard.writeText(shortLinkUrl(link.slug));
    toast.success("Link copiado.");
  };

  if (sessionLoading) {
    return (
      <PartnerScreen title="Links">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Links"
      subtitle="Encurtador Roxou (roxou.click)"
      right={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {!creating && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Novo link
            </Button>
          )}
        </div>
      }
    >
      {creating && (
        <section className="space-y-3 rounded-xl border border-border/50 bg-card/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="l-title">Nome interno</Label>
              <Input id="l-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="l-slug">Código do link</Label>
              <Input
                id="l-slug"
                value={slug}
                placeholder="minha-festa"
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="l-camp">Campanha (opcional)</Label>
              <Input id="l-camp" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="l-target">URL de destino</Label>
              <Input
                id="l-target"
                value={target}
                placeholder="https://..."
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={busy}>
              Gerar link
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
          </div>
        </section>
      )}

      {links.length === 0 && !loading ? (
        <p className="rounded-xl border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
          Você ainda não criou links.
        </p>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/40 p-3"
            >
              <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {link.title || shortLinkUrl(link.slug)}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {shortLinkUrl(link.slug)} · {link.clicks_count ?? 0} cliques
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => copy(link)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Switch checked={link.is_active} onCheckedChange={() => toggle(link)} />
            </div>
          ))}
        </div>
      )}
    </PartnerScreen>
  );
};

export default PartnerLinksPage;
