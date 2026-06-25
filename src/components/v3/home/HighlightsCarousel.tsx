import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export interface HighlightSlide {
  key: string;
  node: ReactNode;
}

interface HighlightsCarouselProps {
  slides: HighlightSlide[];
  autoplayMs?: number;
  label?: string;
}

/**
 * Carrossel de destaques mobile-first.
 *
 * - Cada slide ocupa 100% da largura do container.
 * - Container com overflow-hidden e altura automática baseada no maior slide.
 * - Transição via transform: translateX(-index * 100%).
 * - Autoplay com pausa ao tocar/passar o mouse.
 * - Swipe horizontal funcional.
 * - Indicadores abaixo do card.
 */
export default function HighlightsCarousel({
  slides,
  autoplayMs = 6000,
  label = "Destaques Roxou",
}: HighlightsCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const startXRef = useRef(0);
  const draggedRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);

  const goTo = useCallback((idx: number) => {
    setTransitionEnabled(true);
    setDragOffset(0);
    setActive(idx);
  }, []);

  const scheduleResume = useCallback(() => {
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => setPaused(false), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    };
  }, []);

  // Autoplay
  useEffect(() => {
    if (paused || slides.length <= 1 || !autoplayMs) return;
    const id = window.setInterval(() => {
      const next = (active + 1) % slides.length;
      goTo(next);
    }, autoplayMs);
    return () => window.clearInterval(id);
  }, [active, paused, slides.length, autoplayMs, goTo]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    setPaused(true);
    setTransitionEnabled(false);
    setIsDragging(true);
    startXRef.current = e.touches[0].clientX;
    draggedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const delta = e.touches[0].clientX - startXRef.current;
    setDragOffset(delta);
    if (Math.abs(delta) > 8) draggedRef.current = true;
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const width = containerRef.current?.offsetWidth || 0;
    const threshold = Math.max(48, width * 0.2);

    if (dragOffset < -threshold) {
      goTo(active === slides.length - 1 ? 0 : active + 1);
    } else if (dragOffset > threshold) {
      goTo(active === 0 ? slides.length - 1 : active - 1);
    } else {
      goTo(active);
    }

    setDragOffset(0);
    scheduleResume();
  };

  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (draggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      draggedRef.current = false;
    }
  }, []);

  if (slides.length === 0) return null;

  return (
    <section aria-label={label} className="relative">
      <div ref={containerRef} className="relative w-full overflow-hidden">
        <div
          className={`flex w-full ${
            transitionEnabled ? "transition-transform duration-500 ease-out" : ""
          }`}
          style={{
            transform: `translateX(-${active * 100}%) translateX(${dragOffset}px)`,
            touchAction: "pan-y",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onClickCapture={handleClickCapture}
        >
          {slides.map((s) => (
            <div
              key={s.key}
              className="w-full min-w-full flex-shrink-0 flex flex-col"
            >
              <div className="flex-1 flex flex-col [&>*]:flex [&>*]:flex-col [&>*]:flex-1 [&>*_>*]:flex-1">
                {s.node}
              </div>
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <div
          role="tablist"
          aria-label={`${label} — paginação`}
          className="flex items-center justify-center gap-1.5 pt-2"
        >
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Destaque ${i + 1} de ${slides.length}`}
              onClick={() => {
                setPaused(true);
                goTo(i);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
