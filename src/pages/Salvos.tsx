import BottomNav from "@/components/BottomNav";
import { Bookmark } from "lucide-react";

const Salvos = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl px-4 pt-4 pb-3">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-bold font-display text-foreground">🔖 Eventos Salvos</h1>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 flex flex-col items-center justify-center py-20">
        <div className="rounded-full bg-secondary p-6 mb-4">
          <Bookmark className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-bold font-display text-foreground mb-2">Nenhum evento salvo</h2>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Salve seus eventos favoritos para acessá-los rapidamente aqui.
        </p>
      </main>
      <BottomNav />
    </div>
  );
};

export default Salvos;
