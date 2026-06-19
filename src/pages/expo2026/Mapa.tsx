import { useEffect, useRef, useState } from "react";
import { X, ZoomIn, Plus, Minus, RotateCcw } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import SEO from "@/components/SEO";
import { ExpoLayout } from "@/components/expo/ExpoLayout";
import { SectionTitle, MAPA_IMG } from "@/components/expo/ExpoShared";
import { trackExpoEvent, createDebouncedTracker } from "@/lib/expoAnalytics";

const debouncedZoom = createDebouncedTracker(500);

const SETORES = [
  { label: "Arquibancada", description: "Espaço coberto com assentos numerados em estrutura elevada." },
  { label: "Pista Arena", description: "Área em pé próxima ao palco, com a maior energia do público." },
  { label: "Camarotes", description: "Espaços privativos elevados, com vista privilegiada e serviços diferenciados." },
  { label: "Área VIP", description: "Setor exclusivo com acesso facilitado e estrutura premium." },
  { label: "Front Open Bar", description: "Área frontal com bebidas inclusas (open bar) e ambientação especial." },
  { label: "Palco", description: "Palco principal onde acontecem todos os grandes shows nacionais." },
  { label: "Boate", description: "Ambiente fechado e climatizado para after parties com DJs." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://roxou.com.br/expo2026/mapa#page",
      url: "https://roxou.com.br/expo2026/mapa",
      name: "Mapa Oficial Expo Prudente 2026",
      description: "Mapa oficial dos setores da Expo Prudente 2026: Arquibancada, Pista Arena, Camarotes, Área VIP, Front Open Bar, Palco e Boate.",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: "https://roxou.com.br/" },
        { "@type": "ListItem", position: 2, name: "Expo Prudente 2026", item: "https://roxou.com.br/expo2026" },
        { "@type": "ListItem", position: 3, name: "Mapa", item: "https://roxou.com.br/expo2026/mapa" },
      ],
    },
    {
      "@type": "ImageObject",
      name: "Mapa Oficial dos Setores da Expo Prudente 2026",
      contentUrl: "https://roxou.com.br/images/expo2026-mapa.jpg",
      url: "https://roxou.com.br/expo2026/mapa",
    },
  ],
};

export default function ExpoMapa() {
  const [open, setOpen] = useState(false);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);

  useEffect(() => {
    trackExpoEvent("expo_view", { page: "mapa" }, { once: true, onceKey: "expo_view_mapa" });
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleOpen = () => {
    setOpen(true);
    trackExpoEvent("expo_map_open", { source: "mapa_page" });
  };

  return (
    <ExpoLayout>
      <SEO
        title="Mapa Expo Prudente 2026 | Setores, Camarotes e Pista"
        description="Mapa oficial da Expo Prudente 2026 em Presidente Prudente/SP: Arquibancada, Pista Arena, Camarotes, Área VIP, Front Open Bar, Palco e Boate."
        canonical="https://roxou.com.br/expo2026/mapa"
        ogImage="https://roxou.com.br/images/expo2026-mapa.jpg"
        jsonLd={jsonLd}
      />

      <section className="px-5 pt-10 pb-4 text-center max-w-3xl mx-auto">
        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest bg-gradient-to-r from-[#FF8A00] to-[#FFC300] text-black mb-5">
          🗺️ MAPA OFICIAL
        </span>
        <h1
          className="font-black uppercase leading-[0.95] tracking-tight"
          style={{ fontSize: "clamp(2rem, 8vw, 3.6rem)" }}
        >
          Mapa Expo Prudente 2026
        </h1>
        <p className="mt-4 text-[#B8B8B8]">Toque na imagem para ampliar e dar zoom em alta resolução.</p>
      </section>

      <section className="px-2 sm:px-5 py-6 max-w-5xl mx-auto">
        <button
          type="button"
          onClick={handleOpen}
          className="group block w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0a] relative"
          aria-label="Ampliar mapa do evento"
        >
          <img
            src={MAPA_IMG}
            alt="Mapa oficial dos setores da Expo Prudente 2026"
            className="block w-full h-[85vw] max-h-[650px] sm:h-[520px] md:h-[600px] object-contain bg-black"
            loading="lazy"
          />
          <div className="absolute bottom-3 right-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur text-xs font-semibold border border-white/10">
            <ZoomIn className="w-3.5 h-3.5" /> Toque para ampliar
          </div>
        </button>
      </section>

      <section className="px-5 py-8 max-w-5xl mx-auto">
        <SectionTitle eyebrow="SETORES" title="Conheça cada setor" />
        <div className="grid gap-3 md:grid-cols-2 mt-6">
          {SETORES.map((s) => (
            <article key={s.label} className="rounded-2xl border border-white/10 bg-[#121212] p-4 hover:border-[#FF8A00]/40 transition-colors">
              <h3 className="font-extrabold text-[#FFC300]">{s.label}</h3>
              <p className="mt-1 text-sm text-[#D4D4D4] leading-relaxed">{s.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 py-8 text-center">
        <a href="/expo2026/ingressos" className="text-sm font-bold text-[#FFC300] underline">
          🏛️ Ver mapa completo de Camarotes →
        </a>
      </section>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col" role="dialog" aria-modal="true" aria-label="Mapa ampliado">
          <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/95 z-10">
            <p className="text-xs sm:text-sm text-white/80 pr-2">Arraste ou dê zoom para visualizar os setores</p>
            <button onClick={() => setOpen(false)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" aria-label="Fechar mapa">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 relative bg-black overflow-hidden">
            <TransformWrapper
              ref={transformRef}
              initialScale={1}
              minScale={1}
              maxScale={5}
              doubleClick={{ disabled: false, mode: "zoomIn", step: 0.8 }}
              wheel={{ step: 0.2 }}
              pinch={{ step: 5 }}
              onZoom={(ref) => debouncedZoom("expo_map_zoom", { zoomLevel: Number(ref.state.scale.toFixed(2)) })}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <TransformComponent
                    wrapperStyle={{ width: "100%", height: "100%", background: "#000" }}
                    contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <img
                      src={MAPA_IMG}
                      alt="Mapa oficial Expo Prudente 2026"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      draggable={false}
                    />
                  </TransformComponent>
                  <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
                    <button type="button" onClick={() => zoomIn()} className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center border border-white/10" aria-label="Ampliar">
                      <Plus className="w-5 h-5" />
                    </button>
                    <button type="button" onClick={() => zoomOut()} className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center border border-white/10" aria-label="Reduzir">
                      <Minus className="w-5 h-5" />
                    </button>
                    <button type="button" onClick={() => { resetTransform(); trackExpoEvent("expo_map_reset", {}); }} className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center border border-white/10" aria-label="Resetar zoom">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </TransformWrapper>
          </div>
        </div>
      )}
    </ExpoLayout>
  );
}
