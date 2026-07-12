/**
 * Onda 20 — Diálogo admin para editar Features de um estabelecimento.
 * Reutiliza `VenueFeaturesEditor` e o repository compartilhado.
 */
import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  VenueFeaturesEditor,
  venueFeaturesRepository,
} from "@/modules/discovery/features";

interface Props {
  partnerId: string;
  partnerName: string;
  onClose: () => void;
}

export function EstabelecimentosFeaturesDialog({
  partnerId,
  partnerName,
  onClose,
}: Props) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancel = false;
    venueFeaturesRepository
      .fetch(partnerId)
      .then((rows) => {
        if (cancel) return;
        setSlugs(rows.filter((r) => r.approved !== false).map((r) => r.featureSlug));
        setLoaded(true);
      })
      .catch((err) => {
        if (cancel) return;
        setLoaded(true);
        toast.error(err instanceof Error ? err.message : "Falha ao carregar.");
      });
    return () => {
      cancel = true;
    };
  }, [partnerId]);

  async function handleSave() {
    setSaving(true);
    try {
      await venueFeaturesRepository.save(partnerId, slugs, "manual_admin");
      toast.success("Características salvas.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl bg-card border border-border shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="min-w-0">
            <h2 className="text-sm font-bold truncate">Características</h2>
            <p className="text-[11px] text-muted-foreground truncate">{partnerName}</p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loaded ? (
            <VenueFeaturesEditor
              selectedSlugs={slugs}
              disabled={saving}
              onChange={setSlugs}
            />
          ) : (
            <div className="text-xs text-muted-foreground">Carregando…</div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border p-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!loaded || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Salvando…
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EstabelecimentosFeaturesDialog;
