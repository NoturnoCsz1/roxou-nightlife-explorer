import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Car, Users, Zap, Brain, TrendingUp } from "lucide-react";

export default function V3Sobre() {
  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-8 pb-32 lg:pb-12">
      <div className="flex items-center gap-3">
        <Link
          to="/v3"
          className="w-9 h-9 rounded-full v3-glass flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="font-display font-extrabold text-2xl text-foreground">Sobre a ROXOU</h1>
      </div>

      {/* Hero block */}
      <section className="relative rounded-3xl overflow-hidden p-6 v3-glass-strong">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-[10px] font-bold uppercase tracking-widest text-primary">
            <Sparkles className="w-3 h-3" /> Nossa missão
          </span>
          <h2 className="font-display font-extrabold text-3xl leading-tight text-foreground">
            O elo entre quem produz e <span className="text-primary v3-neon-text">quem vive a noite</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Conectamos empresas e clientes para que turistas, universitários e moradores de
            Presidente Prudente encontrem a melhor experiência da cidade, sem perder tempo.
          </p>
        </div>
      </section>

      {/* Pillars grid */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Brain, title: "Curadoria por IA", text: "Algoritmo que aprende seu gosto e sugere o rolê certo na hora certa." },
          { icon: Car, title: "Transporte integrado", text: "Caronas seguras conectando passageiros e motoristas verificados." },
          { icon: TrendingUp, title: "Marketing de performance", text: "Tráfego qualificado para parceiros, com métricas em tempo real." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl p-4 v3-glass space-y-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(var(--v3-neon) / 0.25), hsl(var(--v3-neon-soft) / 0.15))",
                boxShadow: "0 0 22px hsl(var(--v3-neon) / 0.35)",
              }}
            >
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <p className="font-display font-bold text-sm text-foreground">{title}</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{text}</p>
          </div>
        ))}
      </section>

      {/* Story */}
      <section className="space-y-3 text-sm text-muted-foreground leading-relaxed rounded-3xl v3-glass p-5">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="font-display font-bold text-lg text-foreground">Nossa história</h3>
        </div>
        <p>
          Criada por <strong className="text-foreground">Fernando Henrique</strong>, a ROXOU
          surgiu da visão de um organizador de eventos que entende, na prática, a burocracia do
          setor em Presidente Prudente.
        </p>
        <p>
          Somos o elo entre empresas e clientes, oferecendo o melhor guia para universitários,
          turistas e moradores locais — com tecnologia, dados e atendimento humano.
        </p>
        <p>
          Hoje conectamos milhares de pessoas a centenas de eventos por mês, com integração de
          transporte para quem quer curtir sem se preocupar com a volta para casa.
        </p>
      </section>

      <Link
        to="/v3/contato"
        className="block rounded-2xl py-3.5 text-center font-bold uppercase tracking-wider text-[13px] text-white v3-pulse-glow"
        style={{
          background: "linear-gradient(135deg, hsl(var(--v3-neon)), hsl(var(--v3-neon-soft)))",
        }}
      >
        Fale com a gente
      </Link>
    </div>
  );
}
