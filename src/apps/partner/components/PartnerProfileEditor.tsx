/**
 * PartnerProfileEditor — Fase 9E
 *
 * Formulário de edição controlada do perfil do parceiro.
 * Edita APENAS um subconjunto seguro de colunas da tabela `partners`.
 * Nome, slug, cidade, endereço, lat/lng, status, featured e premiações
 * permanecem sob curadoria da Roxou.
 */
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { validateInstagramHandle } from "@shared/utils/instagramHandle";
import {
  updatePartnerProfile,
  type PartnerEditablePayload,
  type PartnerProfileRow,
} from "../services/partnerProfile";
import PartnerImageUploader from "./PartnerImageUploader";
import PartnerSocialLinksEditor from "./PartnerSocialLinksEditor";
import PartnerOpeningHoursEditor from "./PartnerOpeningHoursEditor";
import PartnerProfilePreview from "./PartnerProfilePreview";
import {
  VenueFeaturesEditor,
  venueFeaturesRepository,
  parseVenueFeaturesJson,
} from "@/modules/discovery/features";

interface Props {
  profile: PartnerProfileRow;
  canSave: boolean;
  canSuggest: boolean;
  onSaved: (row: PartnerProfileRow) => void;
}

interface Draft {
  short_description: string;
  full_description: string;
  instagram: string;
  whatsapp: string;
  logo_url: string;
}

function rowToDraft(row: PartnerProfileRow): Draft {
  return {
    short_description: row.short_description ?? "",
    full_description: row.full_description ?? "",
    instagram: row.instagram ?? row.instagram_username ?? "",
    whatsapp: row.whatsapp ?? "",
    logo_url: row.logo_url ?? "",
  };
}

const SHORT_LIMIT = 160;
const FULL_LIMIT = 2000;

export function PartnerProfileEditor({
  profile,
  canSave,
  canSuggest,
  onSaved,
}: Props) {
  const initial = useMemo(() => rowToDraft(profile), [profile]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const dirty = useMemo(() => {
    return (
      draft.short_description !== initial.short_description ||
      draft.full_description !== initial.full_description ||
      draft.instagram !== initial.instagram ||
      draft.whatsapp !== initial.whatsapp ||
      draft.logo_url !== initial.logo_url
    );
  }, [draft, initial]);

  function patch(p: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...p }));
    setSavedAt(null);
    setError(null);
  }

  async function handleSave() {
    if (!canSave) return;
    setError(null);

    if (draft.short_description.length > SHORT_LIMIT) {
      setError(`Descrição curta excede ${SHORT_LIMIT} caracteres.`);
      return;
    }
    if (draft.full_description.length > FULL_LIMIT) {
      setError(`Descrição completa excede ${FULL_LIMIT} caracteres.`);
      return;
    }
    const ig = validateInstagramHandle(draft.instagram);
    if (!ig.ok) {
      setError(ig.error ?? "Instagram inválido.");
      return;
    }

    const payload: PartnerEditablePayload = {
      short_description: draft.short_description,
      full_description: draft.full_description,
      instagram: draft.instagram,
      whatsapp: draft.whatsapp,
      logo_url: draft.logo_url,
    };

    setSaving(true);
    try {
      const row = await updatePartnerProfile(profile.id, payload);
      onSaved(row);
      setSavedAt(Date.now());
      toast.success("Alterações salvas.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao salvar.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const disabled = !canSave || saving;

  return (
    <div className="space-y-6">
      {!canSave && canSuggest ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
          <Info className="mt-0.5 h-4 w-4 text-amber-500" />
          <div>
            Como <strong>editor</strong>, você pode revisar e propor mudanças.
            A publicação requer aprovação de um <strong>owner</strong> ou{" "}
            <strong>admin</strong> (recurso de sugestões em breve).
          </div>
        </div>
      ) : null}

      {!canSave && !canSuggest ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
          <ShieldAlert className="mt-0.5 h-4 w-4 text-destructive" />
          <div>Seu papel atual não permite editar o perfil deste estabelecimento.</div>
        </div>
      ) : null}

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Nome, endereço e dados principais são revisados pela Roxou. Para
          ajustes nesses campos, contate o suporte.
        </span>
      </div>

      <section className="space-y-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Identidade visual</h2>
        <PartnerImageUploader
          partnerId={profile.id}
          currentUrl={draft.logo_url || null}
          onUploaded={(url) => patch({ logo_url: url })}
          disabled={disabled}
          label="Logo"
        />
      </section>

      <section className="space-y-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Descrição</h2>

        <div className="space-y-1">
          <Label htmlFor="partner-short" className="text-xs">
            Descrição curta
          </Label>
          <Input
            id="partner-short"
            value={draft.short_description}
            disabled={disabled}
            maxLength={SHORT_LIMIT}
            placeholder="Uma frase que resume o seu estabelecimento."
            onChange={(e) => patch({ short_description: e.target.value })}
          />
          <div className="text-[11px] text-muted-foreground">
            {draft.short_description.length}/{SHORT_LIMIT}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="partner-full" className="text-xs">
            Descrição completa
          </Label>
          <Textarea
            id="partner-full"
            value={draft.full_description}
            disabled={disabled}
            maxLength={FULL_LIMIT}
            rows={6}
            placeholder="Conte a história, ambiente, atrações e diferenciais."
            onChange={(e) => patch({ full_description: e.target.value })}
          />
          <div className="text-[11px] text-muted-foreground">
            {draft.full_description.length}/{FULL_LIMIT}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Contato e redes</h2>
        <PartnerSocialLinksEditor
          instagram={draft.instagram}
          whatsapp={draft.whatsapp}
          disabled={disabled}
          onChange={(p) => patch(p)}
        />
      </section>

      <section className="space-y-2">
        <PartnerOpeningHoursEditor />
      </section>

      <section>
        <PartnerProfilePreview base={profile} draft={draft} />
      </section>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 rounded-lg border border-border bg-background/95 p-3 backdrop-blur">
        <div className="text-xs text-muted-foreground">
          {savedAt ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Alterações salvas
            </span>
          ) : dirty ? (
            "Você tem alterações não salvas."
          ) : (
            "Sem alterações pendentes."
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={disabled || !dirty}
          size="sm"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…
            </>
          ) : (
            "Salvar alterações"
          )}
        </Button>
      </div>
    </div>
  );
}

export default PartnerProfileEditor;
