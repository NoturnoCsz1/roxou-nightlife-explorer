import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Mail, Phone, Loader2 } from "lucide-react";
import SEO from "@/components/SEO";

/** Lançamento oficial: Segunda-feira, 04 de Maio de 2026, 18:00 (America/Sao_Paulo) */
function launchTarget(): Date {
  return new Date("2026-05-04T18:00:00-03:00");
}

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

const TimeBlock = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center min-w-[64px] sm:min-w-[84px]">
    <div className="w-full rounded-2xl px-3 py-3 sm:py-4 v3-glass-strong v3-pulse-glow">
      <div className="text-3xl sm:text-5xl font-display font-bold text-center text-white tabular-nums">
        {String(value).padStart(2, "0")}
      </div>
    </div>
    <span className="mt-2 text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
  </div>
);

export default function Maintenance() {
  const target = useMemo(() => launchTarget(), []);
  const { days, hours, minutes, seconds } = useCountdown(target);
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) return;
    setLoading(true);
    try {
      const isEmail = contact.includes("@");
      const payload: { source: string; email?: string; whatsapp?: string } = { source: "maintenance" };
      if (isEmail) payload.email = contact.trim();
      else payload.whatsapp = contact.trim();
      const { error } = await supabase.from("launch_signups").insert(payload);
      if (error) throw error;
      setDone(true);
      toast.success("Tudo certo! Te avisamos no lançamento. 🚀");
    } catch (err) {
      console.error(err);
      toast.error("Não consegui salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="v3-theme min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-5 py-10">
      {/* Animated gradient + particles background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(270_100%_55%/0.25),transparent_55%),radial-gradient(circle_at_80%_70%,hsl(285_90%_55%/0.22),transparent_55%),radial-gradient(circle_at_50%_100%,hsl(320_90%_50%/0.18),transparent_60%)] animate-[v3PulseGlow_6s_ease-in-out_infinite]" />
        <div className="absolute inset-0 opacity-[0.18]" style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.25) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }} />
        {/* Floating particles */}
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-primary/40 blur-[1px]"
            style={{
              width: `${4 + (i % 5)}px`,
              height: `${4 + (i % 5)}px`,
              left: `${(i * 53) % 100}%`,
              top: `${(i * 37) % 100}%`,
              animation: `v3PulseGlow ${3 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-2xl flex flex-col items-center text-center v3-page-fade">
        {/* Logo pulsing glow */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-primary/40 blur-2xl animate-pulse" />
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full v3-glass-strong v3-neon-glow flex items-center justify-center">
            <span className="font-display font-black text-3xl sm:text-4xl text-white v3-neon-text">R</span>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 v3-glass text-[11px] uppercase tracking-[0.18em] text-primary mb-5">
          <Sparkles className="w-3 h-3" />
          ROXOU V3 · Lançamento
        </div>

        <h1 className="font-display font-black text-3xl sm:text-5xl leading-tight text-white">
          O ROLÊ ESTÁ SENDO <span className="v3-neon-text text-primary">REESCRITO.</span>
        </h1>
        <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-xl">
          Estamos preparando a nova ROXOU V3 e a estreia do <strong className="text-white">Prudente IA</strong>.
          O guia mais inteligente de Presidente Prudente volta ao ar na <strong className="text-white">segunda-feira</strong>.
        </p>

        {/* Countdown */}
        <div className="mt-8 flex items-end gap-2 sm:gap-3 justify-center">
          <TimeBlock value={days} label="dias" />
          <TimeBlock value={hours} label="horas" />
          <TimeBlock value={minutes} label="min" />
          <TimeBlock value={seconds} label="seg" />
        </div>

        {/* VIP signup */}
        <div className="mt-10 w-full max-w-md">
          {done ? (
            <div className="v3-glass-strong rounded-2xl p-5 text-sm text-white">
              ✨ Você está na lista VIP. Avisaremos no lançamento — e seus 15 dias de VIP grátis já estão reservados.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="v3-glass-strong rounded-2xl p-4 sm:p-5">
              <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                Seja o primeiro a testar o <strong className="text-white">Prudente IA</strong> e ganhe <strong className="text-primary">15 dias de VIP grátis</strong>.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {contact.includes("@") ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  </div>
                  <input
                    type="text"
                    inputMode="email"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="E-mail ou WhatsApp"
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-3 h-11 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30 transition"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-sm v3-neon-hover disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Me avise no lançamento"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-8 text-[11px] text-muted-foreground/60">
          © 2026 ROXOU — Presidente Prudente · @roxou
        </p>
      </div>
    </div>
  );
}
