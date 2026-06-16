/**
 * PartnerProfileCard — Fase 9D (read-only).
 * Mostra os dados de `partners` sem permitir edição.
 */
import { MapPin, Instagram, BadgeCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PartnerDetails } from "../services/partnerDashboard";

export function PartnerProfileCard({ partner }: { partner: PartnerDetails | null }) {
  if (!partner) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          Nenhum estabelecimento carregado.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-muted">
            {partner.logo_url ? (
              <img
                src={partner.logo_url}
                alt={`Logo de ${partner.name}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : null}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold truncate">{partner.name}</h2>
              {partner.verified_partner ? (
                <BadgeCheck className="h-4 w-4 text-primary" aria-label="Verificado" />
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {partner.type ?? "—"}
              {partner.music_style_primary ? ` · ${partner.music_style_primary}` : ""}
            </div>
            {partner.short_description ? (
              <p className="text-sm mt-2 line-clamp-2">{partner.short_description}</p>
            ) : null}
            <div className="flex flex-col gap-1 mt-3 text-xs text-muted-foreground">
              {partner.formatted_address || partner.address ? (
                <div className="flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span className="truncate">
                    {partner.formatted_address ?? partner.address}
                  </span>
                </div>
              ) : null}
              {partner.instagram_username || partner.instagram ? (
                <div className="flex items-center gap-1.5">
                  <Instagram className="h-3.5 w-3.5" />
                  <span>@{partner.instagram_username ?? partner.instagram}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PartnerProfileCard;
