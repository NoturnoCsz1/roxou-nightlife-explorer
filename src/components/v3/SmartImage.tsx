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
}

/**
 * SmartImage — padroniza carregamento de flyers com skeleton roxo
 * (v3-skeleton) + fade-in suave quando a imagem fica pronta.
 */
export default function SmartImage({
  src,
  alt,
  wrapperClassName,
  className,
  fallbackSrc = "/placeholder.svg",
  loading = "lazy",
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
          "transition-opacity duration-500 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
        {...rest}
      />
    </div>
  );
}
