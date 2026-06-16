/**
 * PartnerBetaLandingPage — Fase 9K
 *
 * Tela inicial do beta fechado: explica o programa, lista recursos e linka
 * para as seções já liberadas no preview interno.
 */
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import {
  CalendarDays,
  BarChart3,
  Users,
  Crown,
  Settings,
  Building2,
} from "lucide-react";

const features = [
  {
    to: "/eventos",
    icon: CalendarDays,
    title: "Eventos",
    desc: "Crie, edite e duplique eventos do seu estabelecimento.",
  },
  {
    to: "/reservas",
    icon: Users,
    title: "Reservas",
    desc: "Gerencie reservas, confirme presenças e configure capacidade.",
  },
  {
    to: "/lista-vip",
    icon: Crown,
    title: "Lista VIP",
    desc: "Cadastre convidados especiais e faça check-in rápido.",
  },
  {
    to: "/analytics",
    icon: BarChart3,
    title: "Analytics",
    desc: "Acompanhe visualizações e desempenho dos seus eventos.",
  },
  {
    to: "/perfil",
    icon: Building2,
    title: "Perfil",
    desc: "Atualize descrição, contato e redes sociais do estabelecimento.",
  },
  {
    to: "/configuracoes",
    icon: Settings,
    title: "Configurações",
    desc: "Preferências e integrações do seu Partner Pro.",
  },
];


const PartnerBetaLandingPage = () => {
  return (
    <main className="space-y-6 p-6">
      <header className="space-y-2">
        <span className="inline-block rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
          Beta Fechado
        </span>
        <h1 className="text-3xl font-bold">Bem-vindo ao Partner Pro</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Você faz parte do beta fechado. Os recursos abaixo estão em
          desenvolvimento ativo — use à vontade e envie feedback pelo botão no
          canto inferior direito. Sujeito a alterações sem aviso.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Link key={f.to} to={f.to}>
            <Card className="h-full p-4 transition hover:border-primary/60">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          </Link>
        ))}
      </section>

      <section className="rounded-lg border border-border/40 bg-card/40 p-4">
        <h2 className="text-sm font-semibold">Como funciona o beta</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Acesso liberado por convite da equipe Roxou.</li>
          <li>Seus dados ficam isolados ao seu estabelecimento.</li>
          <li>O sistema ainda não cobra mensalidade nesta fase.</li>
          <li>Use o widget de feedback para reportar erros e ideias.</li>
        </ul>
      </section>
    </main>
  );
};

export default PartnerBetaLandingPage;
