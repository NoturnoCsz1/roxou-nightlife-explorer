import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { BdaPublicEntry, listPublicPreview } from "@/modules/bda/bdaService";
import { useBdaSettings } from "@/modules/bda/useBdaSettings";
import BdaParticipantCard from "./BdaParticipantCard";
import { BDA_PREVIEW_COUNT, BDA_ROUTES } from "./bdaConfig";

/** Prévia discreta na landing: apenas inscrições reais aprovadas e autorizadas. */
export default function BdaParticipantsPreview() {
  const { settings } = useBdaSettings();
  const [list, setList] = useState<BdaPublicEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    listPublicPreview(BDA_PREVIEW_COUNT.desktop)
      .then(setList)
      .catch(() => {
        setFailed(true);
        setList([]);
      });
  }, []);

  if (!settings.public_list_enabled) return null;

  if (list === null) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-52 animate-pulse rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
    );
  }

  if (failed) {
    return (
      <p className="bda-font-body text-center text-sm text-[#C8D2E0]/70">
        Não foi possível carregar os participantes agora. Atualize a página em instantes.
      </p>
    );
  }

  if (!list.length) {
    return (
      <div className="text-center">
        <p className="bda-font-body text-sm text-[#C8D2E0]/70">
          Os primeiros participantes confirmados aparecerão aqui em breve.
        </p>
        {settings.registrations_open ? (
          <Link
            to={BDA_ROUTES.inscricao}
            className="bda-font-display mt-6 inline-flex h-12 items-center gap-2 rounded-full border border-[#A855F7]/45 px-7 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#A855F7]/12"
          >
            Fazer minha inscrição <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="bda-font-display mt-6 inline-flex h-12 items-center rounded-full border border-[#C8D2E0]/25 px-7 text-xs font-bold uppercase tracking-[0.2em] text-[#C8D2E0]/70">
            Inscrições em breve
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* 4 cards no mobile, até 8 no desktop */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {list.slice(0, BDA_PREVIEW_COUNT.mobile).map((e) => (
          <BdaParticipantCard key={e.registrationId} entry={e} />
        ))}
        {list.slice(BDA_PREVIEW_COUNT.mobile, BDA_PREVIEW_COUNT.desktop).map((e) => (
          <div key={e.registrationId} className="hidden sm:block">
            <BdaParticipantCard entry={e} />
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link
          to={BDA_ROUTES.participantes}
          className="bda-font-display inline-flex h-12 items-center gap-2 rounded-full border border-[#A855F7]/45 px-7 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#A855F7]/12"
        >
          Ver todos os participantes <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
