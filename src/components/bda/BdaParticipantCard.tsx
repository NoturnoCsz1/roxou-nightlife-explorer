import { BadgeCheck, User } from "lucide-react";
import { BdaPublicEntry, BdaPublicParticipant } from "@/modules/bda/bdaService";

/** Moldura hexagonal com foto autorizada ou fallback neutro (sem rosto fictício). */
function BdaAvatar({ p, size = "md" }: { p: BdaPublicParticipant; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-16 w-16" : "h-20 w-20";
  return (
    <div
      className={`relative ${dim} shrink-0 overflow-hidden bg-[#0B0716] ring-1 ring-[#A855F7]/40`}
      style={{ clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)" }}
    >
      {p.photo_public_url ? (
        <img
          src={p.photo_public_url}
          alt={`Foto de ${p.public_name}`}
          loading="lazy"
          decoding="async"
          width={160}
          height={160}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-[#A855F7]/20 to-[#2E7DFF]/10">
          <User aria-hidden className="h-6 w-6 text-[#C8D2E0]/50" />
        </div>
      )}
    </div>
  );
}

function ConfirmedBadge() {
  return (
    <span className="bda-font-body mt-3 inline-flex items-center gap-1 rounded-full border border-[#2E7DFF]/40 bg-[#2E7DFF]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8FC0FF]">
      <BadgeCheck className="h-3 w-3" /> Inscrição confirmada
    </span>
  );
}

/**
 * Card de inscrição confirmada.
 * Solo: um participante. Dupla: card único com os dois integrantes autorizados.
 * Exibe somente dados públicos autorizados — sem pontuação, ranking ou métricas.
 */
export default function BdaParticipantCard({ entry }: { entry: BdaPublicEntry }) {
  const isDupla = entry.category === "dupla";
  const city = entry.members.find((m) => m.city)?.city ?? null;

  return (
    <article className="flex h-full flex-col items-center rounded-2xl border border-[#C8D2E0]/12 bg-white/[0.03] p-4 text-center transition hover:border-[#A855F7]/45 focus-within:border-[#A855F7]/60">
      <span className="bda-font-body mb-3 rounded-full border border-[#A855F7]/35 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8A8FF]">
        {isDupla ? "Dupla" : "Solo"}
      </span>

      <div className={isDupla ? "flex items-center justify-center gap-2" : ""}>
        {entry.members.map((m) => (
          <BdaAvatar key={m.id} p={m} size={isDupla ? "sm" : "md"} />
        ))}
      </div>

      {isDupla && entry.teamName && (
        <h3 className="bda-font-display mt-3 text-sm font-bold uppercase text-white">
          {entry.teamName}
        </h3>
      )}

      <p
        className={`bda-font-${isDupla ? "body" : "display"} mt-${isDupla ? "1" : "3"} text-${
          isDupla ? "[12px] text-[#C8D2E0]/85" : "sm font-bold uppercase text-white"
        }`}
      >
        {entry.members.map((m) => m.public_name).join(" & ")}
      </p>

      {city && <p className="bda-font-body mt-1 text-[11px] text-[#C8D2E0]/60">{city}</p>}

      <div className="mt-auto">
        <ConfirmedBadge />
      </div>
    </article>
  );
}
