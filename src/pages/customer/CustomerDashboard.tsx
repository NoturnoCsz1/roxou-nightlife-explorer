/**
 * CustomerDashboard — central hub da Conta Roxou.
 * Mostra cards para Reservas, Lista VIP, Convites, Pontos e Favoritos.
 */
import { Navigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CalendarCheck,
  Star,
  Ticket,
  Sparkles,
  Heart,
  Settings,
  ChevronRight,
} from "lucide-react";
import SEO from "@/components/SEO";
import { useCustomerSession } from "@/hooks/useCustomerSession";

type CardItem = {
  to: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  disabled?: boolean;
};

const CARDS: CardItem[] = [
  {
    to: "/cliente/minhas-reservas",
    title: "Minhas reservas",
    description: "Mesas, bistrôs e camarotes salvos na sua conta.",
    icon: CalendarCheck,
  },
  {
    to: "/cliente/lista-vip",
    title: "Lista VIP",
    description: "Inscrições em listas VIP confirmadas.",
    icon: Star,
  },
  {
    to: "/cliente/meus-convites",
    title: "Convites e ingressos",
    description: "Em breve: convites digitais e ingressos pagos.",
    icon: Ticket,
    badge: "Em breve",
  },
  {
    to: "#",
    title: "Pontos Roxou",
    description: "Programa de fidelidade da noite. Em breve.",
    icon: Sparkles,
    badge: "Em breve",
    disabled: true,
  },
  {
    to: "#",
    title: "Favoritos",
    description: "Eventos e parceiros salvos. Em breve.",
    icon: Heart,
    badge: "Em breve",
    disabled: true,
  },
  {
    to: "/cliente/minha-conta",
    title: "Minha conta",
    description: "Dados pessoais, preferências e privacidade.",
    icon: Settings,
  },
];

const CustomerDashboard = () => {
  const { user, loading } = useCustomerSession();

  if (loading) {
    return (
      <main className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/cliente/login?redirect=%2Fcliente" replace />;
  }

  const name =
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "Roxou";

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-background">
      <SEO
        title="Conta Roxou | Minha área"
        description="Sua Conta Roxou: reservas, listas VIP, convites e preferências em um só lugar."
      />
      <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-primary">
            Conta Roxou
          </p>
          <h1 className="text-2xl font-bold">Olá, {name} 👋</h1>
          <p className="text-sm text-muted-foreground">
            Tudo o que você reservou, salvou e curtiu na noite, em um só lugar.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CARDS.map((c) => {
            const Icon = c.icon;
            const inner = (
              <Card
                className={`group flex h-full items-start gap-3 p-4 transition ${
                  c.disabled
                    ? "opacity-60"
                    : "hover:border-primary/40 hover:shadow-md"
                }`}
              >
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{c.title}</p>
                    {c.badge ? (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        {c.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.description}
                  </p>
                </div>
                {!c.disabled ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                ) : null}
              </Card>
            );
            if (c.disabled) return <div key={c.title}>{inner}</div>;
            return (
              <Link key={c.title} to={c.to} className="block">
                {inner}
              </Link>
            );
          })}
        </div>

        <div className="pt-2 text-center">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">Voltar para a Home Roxou</Link>
          </Button>
        </div>
      </div>
    </main>
  );
};

export default CustomerDashboard;
