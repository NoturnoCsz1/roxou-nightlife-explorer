import BottomNav from "@/components/BottomNav";
import { Bookmark } from "lucide-react";

const Salvos = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 pt-4 pb-3">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-black font-display text-foreground">🔖 Eventos Salvos</h1>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 flex flex-col items-center justify-center py-24">
        <div className="rounded-2xl gradient-primary p-5 mb-5 neon-glow">
          <Bookmark className="h-10 w-10 text-primary-foreground" />
        </div>
        <h2 className="text-lg font-black font-display text-foreground mb-2">Nenhum evento salvo</h2>
        <p className="text-sm text-muted-foreground text-center max-w-[260px] leading-relaxed">
          Salve seus eventos favoritos para acessá-los rapidamente aqui.
        </p>
      </main>
      <BottomNav />
    </div>
  );
};

export default Salvos;
