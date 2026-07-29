import { useEffect, useMemo, useState } from "react";
import SEO from "@/components/SEO";
import { BdaLayout } from "@/components/bda/BdaLayout";
import BdaParticipantCard from "@/components/bda/BdaParticipantCard";
import { BdaPublicParticipant, listPublicParticipants } from "@/modules/bda/bdaService";

const CANONICAL = "https://roxou.com.br/batalhadeaura/participantes";

export default function BdaParticipantes() {
  const [list, setList] = useState<BdaPublicParticipant[] | null>(null);
  const [filter, setFilter] = useState<"todos" | "solo" | "dupla">("todos");

  useEffect(() => {
    listPublicParticipants()
      .then(setList)
      .catch(() => setList([]));
  }, []);

  const filtered = useMemo(
    () => (list ?? []).filter((p) => filter === "todos" || p.category === filter),
    [list, filter],
  );

  return (
    <BdaLayout>
      <SEO
        title="Participantes confirmados | Batalha de Aura PP"
        description="Lista pública de participantes confirmados da Batalha de Aura PP, publicada somente com autorização."
        canonical={CANONICAL}
      />
      <section className="px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <h1 className="bda-font-display text-center text-2xl font-black uppercase text-white sm:text-4xl [text-shadow:0_0_24px_rgba(168,85,247,0.5)]">
            Participantes confirmados
          </h1>
          <p className="bda-font-body mx-auto mt-3 max-w-xl text-center text-sm text-[#C8D2E0]/70">
            Exibimos apenas participantes aprovados pela organização e com autorização expressa de exibição.
            Nenhum dado pessoal sensível é publicado.
          </p>

          <div className="mt-7 flex justify-center gap-2">
            {(["todos", "solo", "dupla"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`bda-font-display rounded-full border px-5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition ${
                  filter === f
                    ? "border-[#A855F7] bg-[#A855F7]/15 text-white"
                    : "border-[#C8D2E0]/18 text-[#C8D2E0]/60 hover:border-[#2E7DFF]/45"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="mt-9">
            {list === null ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-48 animate-pulse rounded-2xl bg-white/[0.04]" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="bda-font-body text-center text-sm text-[#C8D2E0]/60">
                Ainda não há participantes publicados nesta categoria.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filtered.map((p) => (
                  <BdaParticipantCard key={p.id} p={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </BdaLayout>
  );
}
