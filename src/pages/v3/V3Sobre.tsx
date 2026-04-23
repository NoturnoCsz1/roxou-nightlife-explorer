import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Car, MapPin, Users, Zap } from "lucide-react";

export default function V3Sobre() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-8">
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
            Tecnologia + entretenimento <span className="text-primary v3-neon-text">no interior de SP</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A ROXOU nasceu para conectar quem ama a noite com os melhores rolês do interior paulista — de
            forma simples, rápida e segura. Reunimos festas, shows, baladas e bares em um só lugar, com
            curadoria local e transporte integrado.
          </p>
        </div>
      </section>

      {/* Pillars grid */}
      <section className="grid grid-cols-2 gap-3">
        {[
          { icon: MapPin, title: "Curadoria local", text: "Eventos verificados em cada cidade." },
          { icon: Car, title: "Transporte seguro", text: "Caronas conectando passageiros e motoristas." },
          { icon: Users, title: "Comunidade", text: "Pessoas reais movimentando a cena." },
          { icon: Zap, title: "Tudo em tempo real", text: "Agenda atualizada e alta velocidade." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl p-4 v3-glass space-y-2">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <p className="font-display font-bold text-sm text-foreground">{title}</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{text}</p>
          </div>
        ))}
      </section>

      {/* Story */}
      <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <h3 className="font-display font-bold text-lg text-foreground">Nossa história</h3>
        <p>
          A ROXOU começou em Presidente Prudente com a ideia de unir as pessoas certas aos rolês certos.
          O interior tem cena, tem talento e tem público — só faltava uma plataforma que entendesse
          essa realidade.
        </p>
        <p>
          Hoje conectamos milhares de pessoas a centenas de eventos por mês, com integração de transporte
          para quem quer curtir a noite sem se preocupar com a volta para casa.
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
