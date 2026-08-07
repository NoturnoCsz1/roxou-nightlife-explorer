import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SEO from "@/components/SEO";
import { MAINTENANCE_CONFIG } from "@/config/maintenance";
import { gaEvent } from "@/lib/ga";

function useCountdown(targetIso: string) {
  const target = useMemo(() => new Date(targetIso).getTime(), [targetIso]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diff = Math.max(0, target - now);
  return {
    finished: diff === 0,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

const Block = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center min-w-[68px] sm:min-w-[96px]">
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 sm:py-5 backdrop-blur-xl">
      <div className="font-display text-3xl sm:text-5xl font-black text-center text-white tabular-nums">
        {String(value).padStart(2, "0")}
      </div>
    </div>
    <span className="mt-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white/50">
      {label}
    </span>
  </div>
);

export default function Manutencao() {
  const { days, hours, minutes, seconds, finished } = useCountdown(
    MAINTENANCE_CONFIG.endsAt,
  );
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    gaEvent("maintenance_page_view", {
      requested_path: window.location.pathname,
      maintenance_end: MAINTENANCE_CONFIG.endsAt,
      source: "maintenance_mode",
    });
  }, []);

  const a11yLabel = finished
    ? "Contagem regressiva encerrada"
    : `Faltam ${days} dias, ${hours} horas, ${minutes} minutos e ${seconds} segundos`;

  return (
    <main className="min-h-[100dvh] bg-[#0a0510] text-white relative overflow-hidden flex items-center justify-center px-5 py-12">
      <SEO
        title="Roxou em manutenção | Voltamos em breve"
        description="A Roxou está passando por uma atualização especial. Voltamos na sexta-feira, 7 de agosto, às 18h."
        canonical="https://roxou.com.br/manutencao"
        noindex
        robotsContent="noindex, nofollow"
      />

      {/* Fundo — identidade Roxou (roxo/preto/branco) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(139,42,246,0.28),transparent_55%),radial-gradient(circle_at_85%_80%,rgba(190,60,255,0.18),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative w-full max-w-3xl mx-auto flex flex-col items-center text-center">
        <img
          src="/brand/roxou-symbol.png"
          alt="Símbolo oficial da Roxou"
          width={96}
          height={96}
          className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-[0_0_30px_rgba(139,42,246,0.55)] motion-safe:animate-pulse"
          loading="eager"
          decoding="async"
        />

        <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-[10px] sm:text-xs uppercase tracking-[0.22em] text-primary-foreground/90">
          Atualização da plataforma
        </span>

        <h1 className="mt-5 font-display text-3xl sm:text-5xl font-black leading-tight">
          ESTAMOS PREPARANDO A NOVA ROXOU
        </h1>

        <p className="mt-4 max-w-xl text-sm sm:text-base text-white/70">
        A plataforma está passando por uma atualização especial. Voltamos no
          sábado, 8 de agosto, às 18h.
        </p>

        <section
          className="mt-9 w-full"
          aria-label="Contagem regressiva para o retorno da Roxou"
        >
          {finished ? (
            <p className="font-display text-xl sm:text-2xl font-bold text-primary">
              A nova Roxou está chegando!
            </p>
          ) : (
            <div
              className="flex items-end justify-center gap-2 sm:gap-4"
              role="timer"
              aria-live="off"
              aria-label={a11yLabel}
            >
              <Block value={days} label="dias" />
              <Block value={hours} label="horas" />
              <Block value={minutes} label="minutos" />
              <Block value={seconds} label="segundos" />
            </div>
          )}
        </section>

        <p className="mt-9 text-sm sm:text-base text-white/80">
          A agenda da <strong className="text-white">Expo Prudente 2026</strong>{" "}
          continua disponível.
        </p>

        <Link
          to="/expo2026"
          aria-label="Acessar o hotsite da Expo Prudente 2026"
          className="mt-5 inline-flex w-full sm:w-auto min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-primary px-8 text-sm sm:text-base font-bold text-primary-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0510]"
        >
          ACESSAR EXPO PRUDENTE 2026
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>

        <p className="mt-10 text-[11px] sm:text-xs text-white/40 max-w-md">
          Obrigado pela compreensão. Estamos trabalhando para entregar uma
          experiência ainda melhor.
        </p>
      </div>
    </main>
  );
}
