import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Sparkles } from "lucide-react";
import SEO from "@/components/SEO";
import ContactForm from "@/components/ContactForm";

const CONTACT_TYPES = [
  "Divulgar evento",
  "Parceria comercial",
  "Anunciar na Roxou",
  "Imprensa",
  "Suporte",
  "Sugestão",
  "Outro",
];

export default function Contato() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <SEO
        title="Contato Roxou | Portal de Eventos em Presidente Prudente"
        description="Entre em contato com a Roxou para divulgar eventos, parcerias comerciais, publicidade, imprensa, suporte e sugestões."
        keywords="Roxou contato, divulgar evento Presidente Prudente, anunciar na Roxou, eventos Presidente Prudente, portal de eventos Prudente"
      />

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-purple-700/20 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full bg-fuchsia-600/15 blur-[120px]" />
      </div>

      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/70 hover:text-white transition text-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <Link to="/" className="font-bold tracking-tight bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
            ROXOU
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium mb-5">
            <Sparkles className="w-3.5 h-3.5" /> Atendimento oficial Roxou
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
            <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
              CONTATO ROXOU
            </span>
          </h1>
          <p className="text-white/60 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Fale com a equipe da Roxou para dúvidas, parcerias, divulgação de eventos, imprensa, suporte ou propostas comerciais.
          </p>
          <a
            href="mailto:contato@roxou.com.br"
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600/20 to-fuchsia-600/20 border border-purple-500/40 text-purple-200 hover:border-purple-400 hover:text-white transition shadow-[0_0_30px_rgba(124,58,237,0.25)]"
          >
            <Mail className="w-4 h-4" /> contato@roxou.com.br
          </a>
        </div>

        <ContactForm kind="roxou" contactTypes={CONTACT_TYPES} />

        <div className="mt-12 text-center border-t border-white/5 pt-10">
          <h3 className="text-lg font-bold mb-2 bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
            Roxou — O portal de eventos de Presidente Prudente
          </h3>
          <p className="text-white/60 text-sm max-w-md mx-auto mb-5">
            Eventos, baladas, shows, gastronomia e os melhores rolês da cidade.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-purple-500/40 hover:bg-purple-500/10 hover:border-purple-400 transition text-sm font-bold"
          >
            VOLTAR PARA A HOME <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      </main>
    </div>
  );
}
