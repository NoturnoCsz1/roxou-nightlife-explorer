import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";
import Footer from "@/components/Footer";
import { Bookmark } from "lucide-react";
import { usePageTracking } from "@/hooks/usePageTracking";

const Salvos = () => {
  usePageTracking();
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <DesktopNav />
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 pt-4 pb-3 md:hidden">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-black font-display text-foreground">🔖 Eventos Salvos</h1>
        </div>
      </header>
      <div className="hidden md:block border-b border-border/20 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <h1 className="text-2xl font-black font-display text-foreground">🔖 Eventos Salvos</h1>
        </div>
      </div>
      <main className="mx-auto max-w-lg md:max-w-6xl px-4 md:px-6 flex flex-col items-center justify-center py-24">
        <div className="rounded-2xl gradient-primary p-5 mb-5 neon-glow">
          <Bookmark className="h-10 w-10 text-primary-foreground" />
        </div>
        <h2 className="text-lg font-black font-display text-foreground mb-2">Nenhum evento salvo</h2>
        <p className="text-sm text-muted-foreground text-center max-w-[260px] leading-relaxed">
          Salve seus eventos favoritos para acessá-los rapidamente aqui.
        </p>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
};

export default Salvos;
