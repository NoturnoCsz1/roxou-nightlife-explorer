import { useState, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SmartImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  alt: string;
  /** Classes applied to the wrapper (controls size/aspect). */
  wrapperClassName?: string;
  /** Classes applied to the <img> itself (e.g. object-cover, hover scale). */
  className?: string;
  /** Fallback when src is missing or fails. */
  fallbackSrc?: string;
  /**
   * When true, the image renders visible from the first paint (no opacity fade),
   * so it can be counted as LCP immediately. The skeleton is still shown
   * behind the image until it loads (avoids flash). Use ONLY for LCP images.
   */
  eagerLCP?: boolean;
}

/**
 * SmartImage — padroniza carregamento de flyers com skeleton roxo
 * (v3-skeleton) + fade-in suave quando a imagem fica pronta.
 *
 * `width`, `height`, `sizes`, `srcSet` e demais atributos nativos de <img>
 * são aceitos via {...rest} — retrocompatível com todos os usos existentes.
 */
export default function SmartImage({
  src,
  alt,
  wrapperClassName,
  className,
  fallbackSrc = "/placeholder.svg",
  loading = "lazy",
  eagerLCP = false,
  ...rest
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const finalSrc = errored || !src ? fallbackSrc : src;

  return (
    <div className={cn("relative overflow-hidden", wrapperClassName)}>
      {!loaded && (
        <div
          className="absolute inset-0 v3-skeleton"
          aria-hidden="true"
        />
      )}
      <img
        src={finalSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setErrored(true);
          setLoaded(true);
        }}
        className={cn(
          eagerLCP
            ? "opacity-100"
            : cn("transition-opacity duration-500 ease-out", loaded ? "opacity-100" : "opacity-0"),
          className,
        )}
        {...rest}
      />
    </div>
  );
}

