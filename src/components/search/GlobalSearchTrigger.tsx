import { Search } from "lucide-react";
import { useState, lazy, Suspense } from "react";

const GlobalSearchOverlay = lazy(() => import("./GlobalSearchOverlay"));

interface Props {
  placeholder?: string;
  variant?: "inline" | "compact";
  className?: string;
}

export default function GlobalSearchTrigger({
  placeholder = "Buscar evento, local, vibe...",
  variant = "inline",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir pesquisa"
        className={`w-full flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-[0_0_24px_hsl(var(--v3-neon)/0.25)] text-left ${
          variant === "compact" ? "px-3 py-1.5" : "px-4 py-2.5"
        } ${className}`}
      >
        <Search
          className={`shrink-0 text-primary drop-shadow-[0_0_8px_hsl(var(--v3-neon)/0.7)] ${
            variant === "compact" ? "w-3.5 h-3.5" : "w-4 h-4"
          }`}
        />
        <span
          className={`flex-1 text-muted-foreground/80 truncate ${
            variant === "compact" ? "text-xs" : "text-sm"
          }`}
        >
          {placeholder}
        </span>
        <kbd className="hidden sm:inline-flex shrink-0 text-[10px] font-bold text-muted-foreground bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
          /
        </kbd>
      </button>
      {open && (
        <Suspense fallback={null}>
          <GlobalSearchOverlay open={open} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
