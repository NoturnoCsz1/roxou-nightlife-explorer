import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { BdaPublicParticipant, listPublicParticipants } from "@/modules/bda/bdaService";
import BdaParticipantCard from "./BdaParticipantCard";
import { BDA_ROUTES } from "./bdaConfig";

/** Prévia discreta na landing: no máximo 4 participantes autorizados. */
export default function BdaParticipantsPreview() {
  const [list, setList] = useState<BdaPublicParticipant[] | null>(null);

  useEffect(() => {
    listPublicParticipants()
      .then((rows) => setList(rows.slice(0, 4)))
      .catch(() => setList([]));
  }, []);

  if (list === null) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
    );
  }

  if (!list.length) {
    return (
      <p className="bda-font-body text-center text-sm text-[#C8D2E0]/70">
        A lista de participantes confirmados será publicada conforme as inscrições forem aprovadas.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {list.map((p) => (
          <BdaParticipantCard key={p.id} p={p} />
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link
          to={BDA_ROUTES.participantes}
          className="bda-font-display inline-flex h-12 items-center gap-2 rounded-full border border-[#A855F7]/45 px-7 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#A855F7]/12"
        >
          Ver participantes confirmados <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
