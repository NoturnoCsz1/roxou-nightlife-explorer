import { useEffect, useState } from "react";
import { BDA_PARTNER_TYPE_LABEL, BdaPartner, listPublicPartners } from "@/modules/bda/bdaService";
import { BDA_SOCIAL } from "./bdaConfig";

const GROUPS: Array<BdaPartner["type"]> = ["realizacao", "patrocinio_oficial", "apoio_oficial"];

/** Seção pública de parceiros — exibe apenas registros reais e ativos. */
export default function BdaSponsors() {
  const [partners, setPartners] = useState<BdaPartner[] | null>(null);

  useEffect(() => {
    listPublicPartners()
      .then(setPartners)
      .catch(() => setPartners([]));
  }, []);

  if (partners === null) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="aspect-[3/2] animate-pulse rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
    );
  }

  if (!partners.length) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-[#A855F7]/25 bg-white/[0.03] p-6 text-center">
        <p className="bda-font-body text-sm text-[#C8D2E0]/80">
          Sua empresa pode estar aqui — seja patrocinador.
        </p>
        <a
          href={BDA_SOCIAL.contato}
          className="bda-font-display mt-4 inline-flex h-11 items-center rounded-full border border-[#2E7DFF]/50 px-6 text-xs font-bold uppercase tracking-[0.2em] text-[#8FC0FF] transition hover:bg-[#2E7DFF]/10"
        >
          Falar com a organização
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {GROUPS.map((type) => {
        const group = partners.filter((p) => p.type === type);
        if (!group.length) return null;
        return (
          <div key={type}>
            <h3 className="bda-font-display mb-4 text-center text-sm font-bold uppercase tracking-[0.28em] text-[#C8D2E0]/70">
              {BDA_PARTNER_TYPE_LABEL[type]}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {group.map((p) => {
                const inner = (
                  <img
                    src={p.logo_url}
                    alt={p.logo_alt || p.name}
                    loading="lazy"
                    className="max-h-16 w-full object-contain"
                  />
                );
                const className = `flex aspect-[3/2] items-center justify-center rounded-2xl border p-4 transition ${
                  p.is_featured
                    ? "border-[#A855F7]/50 bg-[#A855F7]/10"
                    : "border-[#C8D2E0]/15 bg-white/[0.03]"
                } hover:border-[#2E7DFF]/50`;
                return p.site_url || p.instagram_url ? (
                  <a
                    key={p.id}
                    href={(p.site_url || p.instagram_url) as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={p.id} className={className}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
