/**
 * PartnerProfilePreview — backend oficial (venues)
 * Mostra como o perfil aparecerá publicamente após salvar.
 */
import { BadgeCheck, Globe, Instagram, MapPin, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { normalizeInstagramHandle } from "@shared/utils/instagramHandle";
import type { VenueProfileRow } from "../services/partnerProfile";

interface Props {
  base: VenueProfileRow;
  draft: {
    description: string;
    instagram: string;
    whatsapp: string;
    contact_phone: string;
    website: string;
    logo_url: string;
  };
}

export function PartnerProfilePreview({ base, draft }: Props) {
  const handle = normalizeInstagramHandle(draft.instagram);
  const address = base.address ?? base.street ?? null;

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
              {base.verified ? (
                <BadgeCheck className="h-4 w-4 text-primary" />
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground">
              {base.venue_type ?? base.category ?? "—"} · {base.city ?? "—"}
            </div>
            <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
              {address ? (
                <div className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{address}</span>
                </div>
              ) : null}
              {handle ? (
                <div className="flex items-center gap-1.5">
                  <Instagram className="h-3.5 w-3.5" />@{handle}
                </div>
              ) : null}
              {draft.whatsapp || draft.contact_phone ? (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {draft.whatsapp || draft.contact_phone}
                </div>
              ) : null}
              {draft.website ? (
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  <span className="truncate">{draft.website}</span>
                </div>
              ) : null}
            </div>
            {draft.description ? (
              <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                {draft.description}
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PartnerProfilePreview;
