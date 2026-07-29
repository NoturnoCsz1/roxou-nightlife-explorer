import { BdaPublicParticipant } from "@/modules/bda/bdaService";
import { BadgeCheck } from "lucide-react";

/** Card de participante confirmado — mostra somente dados autorizados. */
export default function BdaParticipantCard({ p }: { p: BdaPublicParticipant }) {
  const initials = p.public_name.slice(0, 2).toUpperCase();
  return (
    <article className="flex flex-col items-center rounded-2xl border border-[#C8D2E0]/12 bg-white/[0.03] p-4 text-center transition hover:border-[#A855F7]/45">
      <div
        className="relative h-20 w-20 overflow-hidden bg-[#0B0716] ring-1 ring-[#A855F7]/40"
        style={{ clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)" }}
      >
        {p.photo_public_url ? (
          <img
            src={p.photo_public_url}
            alt={`Foto de ${p.public_name}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="bda-font-display flex h-full w-full items-center justify-center text-lg font-black text-[#A855F7]">
            {initials}
          </div>
        )}
      </div>
      <h3 className="bda-font-display mt-3 text-sm font-bold uppercase text-white">{p.public_name}</h3>
      <p className="bda-font-body text-[11px] uppercase tracking-[0.18em] text-[#8FC0FF]">
        {p.category === "dupla" ? p.team_name || "Dupla" : "Solo"}
      </p>
      {p.city && <p className="bda-font-body text-[11px] text-[#C8D2E0]/60">{p.city}</p>}
      <span className="bda-font-body mt-3 inline-flex items-center gap-1 rounded-full border border-[#2E7DFF]/40 bg-[#2E7DFF]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8FC0FF]">
        <BadgeCheck className="h-3 w-3" /> Inscrição confirmada
      </span>
    </article>
  );
}
