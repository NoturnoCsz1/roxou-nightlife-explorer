import type { PilotPartner } from "../partnerPilotService";

export default function PartnerPilotPartnerCard({ partner }: { partner: PilotPartner }) {
  return (
    <div className="rounded-xl border border-border/40 p-4 flex items-center gap-3 bg-card">
      {partner.logo_url ? (
        <img src={partner.logo_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
      ) : (
        <div className="h-14 w-14 rounded-lg bg-muted" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-base font-semibold truncate">{partner.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {[partner.type, partner.city].filter(Boolean).join(" · ")}
        </div>
        {partner.instagram && (
          <a
            href={`https://instagram.com/${partner.instagram.replace(/^@/, "")}`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-primary hover:underline"
          >
            @{partner.instagram.replace(/^@/, "")}
          </a>
        )}
      </div>
    </div>
  );
}
