/**
 * PartnerProfileEditor — backend oficial (venues)
 *
 * Edita apenas o subconjunto seguro de colunas de `venues`, sempre via RPC
 * oficial `partner_update_venue_profile`. Nome, slug, cidade, verificação e
 * status permanecem sob curadoria da Roxou.
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
  updateVenueProfile,
  type VenueEditablePayload,
  type VenueProfileRow,
} from "../services/partnerProfile";
import PartnerImageUploader from "./PartnerImageUploader";
import PartnerSocialLinksEditor from "./PartnerSocialLinksEditor";
import PartnerOpeningHoursEditor from "./PartnerOpeningHoursEditor";
import PartnerProfilePreview from "./PartnerProfilePreview";

interface Props {
  profile: VenueProfileRow;
  canSave: boolean;
  canSuggest: boolean;
  onSaved: (row: VenueProfileRow) => void;
}

export interface ProfileDraft {
  description: string;
  instagram: string;
  whatsapp: string;
  contact_phone: string;
  website: string;
  logo_url: string;
}

function rowToDraft(row: VenueProfileRow): ProfileDraft {
  return {
    description: row.description ?? "",
    instagram: row.instagram ?? "",
    whatsapp: row.whatsapp ?? "",
    contact_phone: row.contact_phone ?? "",
    website: row.website ?? "",
    logo_url: row.logo_url ?? "",
  };
}

const DESCRIPTION_LIMIT = 2000;

export function PartnerProfileEditor({
  profile,
  canSave,
  canSuggest,
  onSaved,
}: Props) {
  const initial = useMemo(() => rowToDraft(profile), [profile]);
  const [draft, setDraft] = useState<ProfileDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const dirty = useMemo(
    () =>
      (Object.keys(initial) as (keyof ProfileDraft)[]).some(
        (k) => draft[k] !== initial[k],
      ),
    [draft, initial],
  );

  function patch(p: Partial<ProfileDraft>) {
    setDraft((d) => ({ ...d, ...p }));
    setSavedAt(null);
    setError(null);
  }

  async function handleSave() {
    if (!canSave) return;
    setError(null);

    if (draft.description.length > DESCRIPTION_LIMIT) {
      setError(`Descrição excede ${DESCRIPTION_LIMIT} caracteres.`);
      return;
    }
    const ig = validateInstagramHandle(draft.instagram);
    if (!ig.ok) {
      setError(ig.error ?? "Instagram inválido.");
      return;
    }

    const payload: VenueEditablePayload = {
      description: draft.description,
      instagram: draft.instagram,
      whatsapp: draft.whatsapp,
      contact_phone: draft.contact_phone,
      website: draft.website,
      logo_url: draft.logo_url,
    };

    setSaving(true);
    try {
      const row = await updateVenueProfile(profile.id, payload);
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
            <strong>admin</strong>.
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
          organizationId={profile.organization_id ?? ""}
          currentUrl={draft.logo_url || null}
          onUploaded={(url) => patch({ logo_url: url })}
          disabled={disabled}
          label="Logo"
        />
      </section>

      <section className="space-y-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Descrição</h2>
        <div className="space-y-1">
          <Label htmlFor="venue-description" className="text-xs">
            Sobre o estabelecimento
          </Label>
          <Textarea
            id="venue-description"
            value={draft.description}
            disabled={disabled}
            maxLength={DESCRIPTION_LIMIT}
            rows={6}
            placeholder="Conte a história, ambiente, atrações e diferenciais."
            onChange={(e) => patch({ description: e.target.value })}
          />
          <div className="text-[11px] text-muted-foreground">
            {draft.description.length}/{DESCRIPTION_LIMIT}
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
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="venue-phone" className="text-xs">
              Telefone de contato
            </Label>
            <Input
              id="venue-phone"
              value={draft.contact_phone}
              inputMode="tel"
              maxLength={20}
              disabled={disabled}
              placeholder="+55 18 3333-3333"
              onChange={(e) => patch({ contact_phone: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="venue-website" className="text-xs">
              Site
            </Label>
            <Input
              id="venue-website"
              value={draft.website}
              disabled={disabled}
              placeholder="https://seusite.com.br"
              onChange={(e) => patch({ website: e.target.value })}
            />
          </div>
        </div>
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
        <Button onClick={handleSave} disabled={disabled || !dirty} size="sm">
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
