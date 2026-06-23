import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Helmet } from "react-helmet-async";

type Props = {
  title: string;
  description: string;
  emoji: string;
};

export default function TransportesComingSoon({ title, description, emoji }: Props) {
  const location = useLocation();
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-[#0b0418] to-[#150726] px-4 pb-24 pt-6 text-white">
      <Helmet>
        <title>{title} | Roxou Transporte</title>
        <meta name="description" content={description} />
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <Link
          to="/transportes"
          className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Transporte
        </Link>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/30 to-purple-600/30 text-3xl">
            {emoji}
          </div>
          <h1 className="mt-4 font-['Space_Grotesk'] text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-white/70">{description}</p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-fuchsia-200">
            <Sparkles className="h-3.5 w-3.5" /> Em breve
          </div>

          <p className="mt-6 text-xs text-white/50">
            Estamos liberando o módulo gradualmente. Volte em breve ou acompanhe pela aba{" "}
            <Link to="/transportes" className="text-fuchsia-300 underline">
              Transporte
            </Link>
            .
          </p>

          <p className="mt-2 text-[10px] text-white/30">{location.pathname}</p>
        </div>
      </div>
    </div>
  );
}
