import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Navigation, Sparkles, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function PrivativoPlaceholder() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = "Transporte Privativo | Roxou Transportes";
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/.+@.+\..+/.test(trimmed)) {
      toast.error("Informe um e-mail válido");
      return;
    }
    try {
      const key = "roxou:privativo:waitlist";
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      if (!list.includes(trimmed)) list.push(trimmed);
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      /* ignore */
    }
    setSubmitted(true);
    toast.success("Avisaremos você assim que liberarmos a região.");
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-[#0b0418] to-[#150726] px-4 pb-24 pt-6 text-white overflow-x-hidden">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          to="/transportes"
          className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Transportes
        </Link>

        <header className="mt-6 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200">
            <Sparkles className="h-3 w-3" /> Em expansão
          </span>
          <h1 className="font-['Space_Grotesk'] text-3xl font-bold leading-tight">
            Transporte Privativo
          </h1>
          <p className="text-sm text-white/70">
            Solicite ida e volta para eventos com motoristas parceiros.
          </p>
        </header>

        <section className="mt-6 grid gap-3">
          {[
            { title: "Ida e volta combinada", desc: "Você define embarque, evento e horário de retorno." },
            { title: "Motoristas parceiros", desc: "Operadores verificados pela Roxou, com placa e veículo identificados." },
            { title: "Acompanhamento", desc: "Receba status e contato direto do motorista pelo app." },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15">
                  <Navigation className="h-5 w-5 text-sky-300" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="mt-0.5 text-xs text-white/65">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold">Receber novidades</h2>
          <p className="mt-1 text-xs text-white/65">
            Avise-me quando o Transporte Privativo estiver disponível na minha região.
          </p>

          {submitted ? (
            <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              Pronto! Avisaremos você por e-mail assim que liberarmos a região.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <Input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <Button type="submit" className="w-full sm:w-auto">
                Receber novidades
              </Button>
            </form>
          )}
        </section>

        <p className="mx-auto mt-6 max-w-xl text-center text-[11px] text-white/40">
          Sem backend nesta etapa. Os contatos ficam apenas no seu dispositivo até liberarmos a operação.
        </p>
      </div>
    </div>
  );
}
