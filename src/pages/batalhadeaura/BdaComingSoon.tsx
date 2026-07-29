import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { BdaLayout } from "@/components/bda/BdaLayout";
import { BDA_ROUTES } from "@/components/bda/bdaConfig";

/**
 * Placeholder das sub-rotas do hotsite (arquitetura pronta, conteúdo futuro).
 * Emite noindex para não gerar Soft 404 no Google.
 */
export default function BdaComingSoon({ title }: { title: string }) {
  return (
    <BdaLayout>
      <SEO
        title={`${title} | Batalha de Aura PP`}
        description="O primeiro campeonato de Farmar Aura de Presidente Prudente."
        noindex
      />
      <section className="flex min-h-[70svh] flex-col items-center justify-center px-4 text-center">
        <span className="bda-font-body rounded-full border border-[#2E7DFF]/40 bg-[#2E7DFF]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#8FC0FF]">
          Em breve
        </span>
        <h1 className="bda-font-display mt-4 text-3xl font-black uppercase text-white sm:text-5xl [text-shadow:0_0_26px_rgba(168,85,247,0.6)]">
          {title}
        </h1>
        <p className="bda-font-body mt-3 max-w-sm text-[#C8D2E0]/75">
          Esta área da Batalha de Aura PP está sendo preparada e será liberada em breve.
        </p>
        <Link
          to={BDA_ROUTES.home}
          className="bda-font-display mt-8 inline-flex h-11 items-center rounded-full border border-[#C8D2E0]/25 px-6 text-xs font-bold uppercase tracking-[0.2em] text-[#C8D2E0] transition-colors hover:border-[#A855F7] hover:text-white"
        >
          Voltar ao início
        </Link>
      </section>
    </BdaLayout>
  );
}
