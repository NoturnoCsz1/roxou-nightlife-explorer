import { type ReactNode } from "react";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";

interface FadeSectionProps {
  className?: string;
  children: ReactNode;
}

/**
 * FadeSection — wrapper de seção com fade-in scroll-triggered.
 *
 * Extraído de V3Home.tsx para reduzir o tamanho do arquivo principal,
 * sem alterar visual, animações ou comportamento.
 */
export default function FadeSection({ className, children }: FadeSectionProps) {
  const { ref, visible } = useScrollFadeIn();
  return (
    <section
      ref={ref}
      className={`transition-all duration-500 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} ${className || ""}`}
    >
      {children}
    </section>
  );
}
