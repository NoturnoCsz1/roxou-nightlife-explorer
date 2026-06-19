import { useEffect, useMemo, useRef, useState } from "react";
import { X, ZoomIn, Plus, Minus, RotateCcw, MapPin, MessageCircle } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  useExpoCamarotes,
  STATUS_LABEL,
  STATUS_COLOR,
  STATUS_TEXT_COLOR,
  buildCamaroteWhatsappUrl,
  buildCamaroteGeneralWhatsappUrl,
  type Camarote,
} from "@/hooks/useExpoCamarotes";
import { trackExpoEvent } from "@/lib/expoAnalytics";

const MAPA_CAMAROTES_IMG = "/images/expo2026-camarotes.jpg";

const CHIPS = [
  "120 camarotes",
  "Setores numerados",
  "Venda oficial",
  "WhatsApp disponível",
];

export default function CamarotesSection() {
  const { camarotes } = useExpoCamarotes();
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [selected, setSelected] = useState<Camarote | null>(null);
  const observerRef = useRef<HTMLDivElement | null>(null);

  const counts = useMemo(() => {
    const c = { available: 0, reserved: 0, sold: 0 };
    camarotes.forEach((x) => {
      c[x.status] = (c[x.status] ?? 0) + 1;
    });
    return c;
  }, [camarotes]);

  // expo_camarotes_view (uma vez por sessão, quando seção entra em viewport)
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            trackExpoEvent("expo_camarotes_view", {}, { once: true });
            obs.disconnect();
          }
        });
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Bloqueia scroll quando modal aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selected) setSelected(null);
        else setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, selected]);

  const openMap = () => {
    if (imgError) return;
    setOpen(true);
    trackExpoEvent("expo_camarotes_map_open", {});
  };

  const handleCamaroteClick = (c: Camarote) => {
    setSelected(c);
    trackExpoEvent("expo_camarote_click", {
      camaroteNumber: c.number,
      status: c.status,
    });
    if (c.status === "sold") {
      trackExpoEvent("expo_camarote_sold_view", { camaroteNumber: c.number });
    } else if (c.status === "reserved") {
      trackExpoEvent("expo_camarote_reserved_view", { camaroteNumber: c.number });
    }
  };

  const handleWhatsApp = (number?: number) => {
    trackExpoEvent("expo_camarotes_whatsapp_click", {
      camaroteNumber: number ?? null,
    });
  };

  return (
    <section
      ref={observerRef}
      id="camarotes"
      className="px-2 sm:px-5 py-12 max-w-5xl mx-auto"
    >
      <div className="text-center mb-6">
        <p
          className="text-xs font-bold tracking-[0.3em] mb-3 bg-clip-text text-transparent"
          style={{ backgroundImage: "linear-gradient(135deg, #FF8A00, #FFC300)" }}
        >
          CAMAROTES LIBERADOS
        </p>
        <h2
          className="font-black uppercase leading-tight"
          style={{ fontSize: "clamp(1.5rem, 5.5vw, 2.4rem)" }}
        >
          Escolha seu espaço na Expo Prudente 2026
        </h2>
      </div>

      <p className="text-center text-sm text-[#B8B8B8] max-w-2xl mx-auto px-4 leading-relaxed">
        A organização oficial divulgou o mapa de camarotes da Expo Prudente
        2026. São 120 espaços numerados para quem deseja acompanhar os shows
        com mais conforto e exclusividade.
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2 px-2">
        {CHIPS.map((c) => (
          <span
            key={c}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border border-white/10 bg-[#121212] text-[#FFC300]"
          >
            • {c}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={openMap}
        className="group block w-full mt-6 rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0a] relative"
        aria-label="Ampliar mapa dos camarotes"
      >
        {!imgError ? (
          <>
            <img
              src={MAPA_CAMAROTES_IMG}
              alt="Mapa oficial dos camarotes da Expo Prudente 2026 com 120 espaços numerados"
              className="block w-full h-[85vw] max-h-[650px] sm:h-[520px] md:h-[600px] object-contain bg-black"
              loading="lazy"
              onError={() => setImgError(true)}
            />
            <div className="absolute bottom-3 right-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur text-xs font-semibold border border-white/10">
              <ZoomIn className="w-3.5 h-3.5" /> Toque para ver disponibilidade
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 p-10 text-center h-[60vw] max-h-[420px]">
            <MapPin className="w-10 h-10 text-[#FF8A00]" />
            <p className="text-[#B8B8B8] text-sm max-w-xs">
              Mapa de camarotes em breve.
            </p>
          </div>
        )}
      </button>

      {/* Legenda + counts */}
      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3 max-w-xl mx-auto">
        <LegendCard color="bg-emerald-500" label="Disponíveis" value={counts.available} />
        <LegendCard color="bg-amber-400" label="Reservados" value={counts.reserved} />
        <LegendCard color="bg-rose-500" label="Vendidos" value={counts.sold} />
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <a
          href={buildCamaroteGeneralWhatsappUrl()}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleWhatsApp()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-extrabold text-black text-sm shadow-[0_10px_30px_-10px_rgba(255,138,0,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(135deg, #FF8A00, #FFC300)" }}
        >
          <MessageCircle className="w-4 h-4" />
          CONSULTAR CAMAROTES PELO WHATSAPP
        </a>
        <p className="text-[11px] text-[#888] text-center max-w-md leading-relaxed">
          A Roxou realiza apenas a divulgação de informações públicas e não é
          organizadora oficial nem responsável pela comercialização dos camarotes.
        </p>
      </div>

      {/* ============== MODAL ============== */}
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Mapa dos camarotes ampliado"
        >
          <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/95 z-10">
            <p className="text-xs sm:text-sm text-white/80 pr-2">
              Toque em um camarote para ver disponibilidade · {camarotes.length}/120
            </p>
            <button
              onClick={() => setOpen(false)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              aria-label="Fechar mapa"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mapa zoomável */}
          <div className="relative bg-black overflow-hidden" style={{ height: "55vh" }}>
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={5}
              doubleClick={{ disabled: false, mode: "zoomIn", step: 0.8 }}
              wheel={{ step: 0.2 }}
              pinch={{ step: 5 }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <TransformComponent
                    wrapperStyle={{ width: "100%", height: "100%", background: "#000" }}
                    contentStyle={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={MAPA_CAMAROTES_IMG}
                      alt="Mapa oficial dos camarotes da Expo Prudente 2026"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      draggable={false}
                      onError={() => setImgError(true)}
                    />
                  </TransformComponent>
                  <div className="absolute bottom-3 right-3 flex flex-col gap-2 z-20">
                    <button
                      type="button"
                      onClick={() => zoomIn()}
                      className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center border border-white/10"
                      aria-label="Ampliar"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => zoomOut()}
                      className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center border border-white/10"
                      aria-label="Reduzir"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => resetTransform()}
                      className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center border border-white/10"
                      aria-label="Resetar zoom"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </TransformWrapper>
          </div>

          {/* Grid 1-120 */}
          <div className="flex-1 overflow-y-auto bg-black px-3 py-4">
            <div className="flex items-center justify-center gap-4 mb-3 text-[11px]">
              <LegendDot color="bg-emerald-500" label="Disponível" />
              <LegendDot color="bg-amber-400" label="Reservado" />
              <LegendDot color="bg-rose-500" label="Vendido" />
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5 max-w-3xl mx-auto">
              {Array.from({ length: 120 }, (_, i) => i + 1).map((n) => {
                const c = camarotes.find((x) => x.number === n);
                const status = (c?.status ?? "available") as keyof typeof STATUS_COLOR;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      handleCamaroteClick(
                        c ?? {
                          number: n,
                          status: "available",
                          customer_name: null,
                          notes: null,
                          updated_at: "",
                        },
                      )
                    }
                    className={`relative aspect-square rounded-md text-[10px] sm:text-xs font-bold text-black/85 ${STATUS_COLOR[status]} hover:scale-110 active:scale-95 transition-transform`}
                    aria-label={`Camarote ${n} - ${STATUS_LABEL[status]}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Popup do camarote selecionado */}
      {selected && (
        <div
          className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#121212] p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-bold tracking-widest text-[#FFC300]">
              CAMAROTE
            </p>
            <p className="text-5xl font-black my-2">{selected.number}</p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10">
              <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLOR[selected.status]}`} />
              <span className={`text-xs font-bold ${STATUS_TEXT_COLOR[selected.status]}`}>
                {STATUS_LABEL[selected.status]}
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              {selected.status === "available" ? (
                <a
                  href={buildCamaroteWhatsappUrl(selected.number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleWhatsApp(selected.number)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-extrabold text-black text-sm"
                  style={{ background: "linear-gradient(135deg, #FF8A00, #FFC300)" }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Tenho interesse
                </a>
              ) : (
                <p className="text-xs text-[#B8B8B8] px-2">
                  Este camarote não está disponível. Consulte outros pelo WhatsApp.
                </p>
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-5 py-2.5 rounded-full text-sm font-bold border border-white/15 text-white/90 bg-white/5 hover:bg-white/10"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function LegendCard({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#121212] p-3 text-center">
      <div className="flex items-center justify-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <p className="text-[11px] font-bold tracking-wider text-white/80 uppercase">{label}</p>
      </div>
      <p className="text-2xl font-black mt-1">{value}</p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-white/80">
      <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
      {label}
    </span>
  );
}
