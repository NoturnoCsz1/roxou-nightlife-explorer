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
 * Carrossel horizontal com snap, autoplay opcional e indicadores.
 * Cada slide é renderizado em largura total. Não altera o visual interno
 * dos cards passados (Expo, Copa, FEJUPI, campanhas, etc.).
 */
export default function HighlightsCarousel({
  slides,
  autoplayMs = 6000,
  label = "Destaques Roxou",
}: HighlightsCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const target = el.children[idx] as HTMLElement | undefined;
    if (!target) return;
    el.scrollTo({ left: target.offsetLeft, behavior: "smooth" });
  }, []);

  // Detectar slide ativo via IntersectionObserver
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const items = Array.from(el.children) as HTMLElement[];
    if (items.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = items.indexOf(entry.target as HTMLElement);
            if (idx >= 0) setActive(idx);
          }
        });
      },
      { root: el, threshold: [0.6] },
    );
    items.forEach((it) => io.observe(it));
    return () => io.disconnect();
  }, [slides.length]);

  // Autoplay
  useEffect(() => {
    if (paused || slides.length <= 1 || !autoplayMs) return;
    const id = window.setInterval(() => {
      const next = (active + 1) % slides.length;
      goTo(next);
    }, autoplayMs);
    return () => window.clearInterval(id);
  }, [active, paused, slides.length, autoplayMs, goTo]);

  if (slides.length === 0) return null;

  return (
    <section aria-label={label} className="relative">
      <div
        ref={scrollerRef}
        onTouchStart={() => setPaused(true)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {slides.map((s) => (
          <div
            key={s.key}
            className="min-w-full shrink-0 snap-center"
          >
            {s.node}
          </div>
        ))}
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
