/**
 * PartnerProfilePreview — Fase 9E
 * Mostra como o perfil do parceiro aparecerá publicamente após salvar.
 */
import { BadgeCheck, Instagram, MapPin, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { normalizeInstagramHandle } from "@/lib/instagramHandle";
import type { PartnerProfileRow } from "../services/partnerProfile";

interface Props {
  base: PartnerProfileRow;
  draft: {
    short_description: string;
    full_description: string;
    instagram: string;
    whatsapp: string;
    logo_url: string;
  };
}

export function PartnerProfilePreview({ base, draft }: Props) {
  const handle = normalizeInstagramHandle(draft.instagram);
  return (
    <Card className="border-primary/30">
      <CardContent className="p-4">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-primary">
          Pré-visualização
        </div>
        <div className="flex gap-3">
          <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-muted">
            {draft.logo_url ? (
              <img
                src={draft.logo_url}
                alt={`Logo de ${base.name}`}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold">{base.name}</h3>
              {base.verified_partner ? (
                <BadgeCheck className="h-4 w-4 text-primary" />
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground">
              {base.type ?? "—"} · {base.city}
            </div>
            {draft.short_description ? (
              <p className="mt-1.5 text-sm line-clamp-2">
                {draft.short_description}
              </p>
            ) : null}
            <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
              {base.formatted_address || base.address ? (
                <div className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {base.formatted_address ?? base.address}
                  </span>
                </div>
              ) : null}
              {handle ? (
                <div className="flex items-center gap-1.5">
                  <Instagram className="h-3.5 w-3.5" />@{handle}
                </div>
              ) : null}
              {draft.whatsapp ? (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {draft.whatsapp}
                </div>
              ) : null}
            </div>
            {draft.full_description ? (
              <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                {draft.full_description}
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PartnerProfilePreview;
