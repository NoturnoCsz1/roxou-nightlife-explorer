import { cn } from "@/lib/utils";

interface PartnerLogoProps {
  src?: string | null;
  alt: string;
  /** Letra de fallback quando não há logo */
  fallback?: string;
  /** Tamanho preset ou className livre via `className` */
  size?: "sm" | "md" | "lg" | "xl";
  /** Forma do frame */
  rounded?: "lg" | "xl" | "2xl" | "full";
  /** Ativa hover suave (escala leve + glow) */
  interactive?: boolean;
  /** Atributos do <img> */
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  className?: string;
}

const sizeMap = {
  sm: "h-10 w-10 p-1",
  md: "h-14 w-14 p-1.5",
  lg: "h-16 w-16 p-2",
  xl: "h-20 w-20 p-2.5",
} as const;

const roundedMap = {
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
} as const;

/**
 * PartnerLogo — frame dark/neon padronizado para logos de parceiros.
 *
 * - Container escuro translúcido com leve gradiente radial roxo
 * - Borda sutil neon (primary/20) com hover mais forte
 * - Padding interno para respirar
 * - `object-contain` para preservar o logo original sem cortar
 * - Fallback elegante com inicial do parceiro
 *
 * Não edita o arquivo da imagem; apenas padroniza a exibição.
 */
export default function PartnerLogo({
  src,
  alt,
  fallback,
  size = "md",
  rounded = "xl",
  interactive = false,
  loading = "lazy",
  fetchPriority,
  className,
}: PartnerLogoProps) {
  const initial = (fallback || alt || "?").trim().charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden flex items-center justify-center",
        "bg-background/60 backdrop-blur-sm",
        "border border-primary/20 ring-1 ring-white/5",
        "shadow-[inset_0_0_20px_-8px_hsl(var(--primary)/0.25)]",
        "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.18),transparent_65%)] before:pointer-events-none",
        interactive && "transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_22px_-6px_hsl(var(--primary)/0.55)]",
        sizeMap[size],
        roundedMap[rounded],
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          {...(fetchPriority ? { fetchPriority } : {})}
          className={cn(
            "relative z-10 h-full w-full object-contain",
            interactive && "transition-transform duration-300 group-hover:scale-[1.04]",
          )}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span className="relative z-10 font-display font-black text-primary/70 text-[1.1em]">
          {initial}
        </span>
      )}
    </div>
  );
}
