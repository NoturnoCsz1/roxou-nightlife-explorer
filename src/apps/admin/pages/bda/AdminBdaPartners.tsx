import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import ImageUpload from "@/components/admin/ImageUpload";
import {
  BDA_PARTNER_TYPE_LABEL,
  BdaPartner,
  BdaPartnerType,
  adminDeletePartner,
  adminListPartners,
  adminSavePartner,
} from "@/modules/bda/bdaService";

type Draft = Partial<BdaPartner> & { name: string; logo_url: string };

const emptyDraft = (): Draft => ({
  name: "",
  logo_url: "",
  logo_alt: "",
  type: "apoio_oficial",
  site_url: "",
  instagram_url: "",
  display_order: 0,
  is_active: true,
  is_featured: false,
});

const input =
  "w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60";

export default function AdminBdaPartners() {
  const [partners, setPartners] = useState<BdaPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setPartners(await adminListPartners());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!draft?.name || !draft.logo_url) {
      toast.error("Nome e logo são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      await adminSavePartner(draft);
      toast.success("Parceiro salvo.");
      setDraft(null);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remover este parceiro?")) return;
    try {
      await adminDeletePartner(id);
      toast.success("Parceiro removido.");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-black">Batalha de Aura — Parceiros</h1>
          <p className="text-xs text-muted-foreground">
            Patrocinadores, apoiadores e realização exibidos no hotsite.
          </p>
        </div>
        <button
          onClick={() => setDraft(emptyDraft())}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Novo parceiro
        </button>
      </div>

      {draft && (
        <div className="rounded-2xl border border-border/40 bg-card/40 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-medium text-muted-foreground">Nome</span>
              <input className={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-muted-foreground">Tipo</span>
              <select
                className={input}
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as BdaPartnerType })}
              >
                {Object.entries(BDA_PARTNER_TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-muted-foreground">Texto alternativo do logo</span>
              <input className={input} value={draft.logo_alt ?? ""} onChange={(e) => setDraft({ ...draft, logo_alt: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-muted-foreground">Ordem de exibição</span>
              <input
                type="number"
                className={input}
                value={draft.display_order ?? 0}
                onChange={(e) => setDraft({ ...draft, display_order: Number(e.target.value) })}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-muted-foreground">Site</span>
              <input className={input} value={draft.site_url ?? ""} onChange={(e) => setDraft({ ...draft, site_url: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-muted-foreground">Instagram</span>
              <input className={input} value={draft.instagram_url ?? ""} onChange={(e) => setDraft({ ...draft, instagram_url: e.target.value })} />
            </label>
          </div>

          <div className="mt-4">
            <ImageUpload
              folder="bda-partners"
              currentUrl={draft.logo_url}
              label="Logo do parceiro"
              onUploaded={(url) => setDraft({ ...draft, logo_url: url })}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={draft.is_active ?? true} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />
              Ativo
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={draft.is_featured ?? false} onChange={(e) => setDraft({ ...draft, is_featured: e.target.checked })} />
              Destaque
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
            </button>
            <button onClick={() => setDraft(null)} className="h-10 rounded-xl border border-border/40 px-4 text-xs">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : partners.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum parceiro cadastrado.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border/40 bg-card/40 p-4">
              <div className="flex h-20 items-center justify-center rounded-xl bg-background/60">
                <img src={p.logo_url} alt={p.logo_alt || p.name} className="max-h-14 object-contain" />
              </div>
              <p className="mt-3 text-sm font-bold text-foreground">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {BDA_PARTNER_TYPE_LABEL[p.type]} · ordem {p.display_order}
                {p.is_active === false && " · inativo"}
                {p.is_featured && " · destaque"}
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setDraft(p as Draft)} className="h-9 flex-1 rounded-lg border border-border/40 text-xs">
                  Editar
                </button>
                <button onClick={() => remove(p.id)} className="h-9 rounded-lg border border-destructive/40 px-3 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
