import { Search, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

interface SearchableEvent {
  id: string;
  slug: string;
  title: string;
  image_url?: string | null;
  venue_name?: string | null;
  category?: string | null;
  sub_category?: string | null;
  description?: string | null;
}

interface Props {
  events: SearchableEvent[];
  variant?: "inline" | "compact";
  placeholder?: string;
  /** Quando informado, controla o termo (modo controlado p/ filtro de página). */
  value?: string;
  onChange?: (term: string) => void;
  /** Sugestão de evento em destaque para estado vazio. */
  fallbackEvent?: SearchableEvent | null;
  className?: string;
}

const norm = (s: string | null | undefined) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Fuzzy simples: divide o termo em tokens e exige todos como substrings. */
const fuzzyMatch = (haystack: string, needle: string) => {
  const h = norm(haystack);
  const tokens = norm(needle).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((t) => h.includes(t));
};

export default function V3SearchBar({
  events,
  variant = "inline",
  placeholder = "Buscar evento, local, vibe...",
  value,
  onChange,
  fallbackEvent,
  className = "",
}: Props) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState("");
  const term = isControlled ? value! : internal;
  const setTerm = (t: string) => {
    if (!isControlled) setInternal(t);
    onChange?.(t);
  };

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const results = term.trim().length >= 2
    ? events.filter((e) => {
        const haystack = [e.title, e.venue_name, e.category, e.sub_category, e.description].join(" ");
        return fuzzyMatch(haystack, term);
      }).slice(0, 8)
    : [];

  const showDropdown = open && term.trim().length >= 2;
  const showEmpty = showDropdown && results.length === 0;

  return (
    <div ref={ref} className={`relative w-full ${className}`}>
      <div
        className={`flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md transition-all focus-within:border-primary/50 focus-within:shadow-[0_0_24px_hsl(var(--v3-neon)/0.35)] ${
          variant === "compact" ? "px-3 py-1.5" : "px-4 py-2.5"
        }`}
      >
        <Search
          className={`shrink-0 text-primary drop-shadow-[0_0_8px_hsl(var(--v3-neon)/0.7)] ${
            variant === "compact" ? "w-3.5 h-3.5" : "w-4 h-4"
          }`}
        />
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/70 ${
            variant === "compact" ? "text-xs" : "text-sm"
          }`}
        />
        {term && (
          <button
            type="button"
            onClick={() => {
              setTerm("");
              setOpen(false);
            }}
            className="shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Limpar busca"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* DROPDOWN DE RESULTADOS */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-white/10 bg-background/95 backdrop-blur-xl shadow-[0_12px_48px_rgba(0,0,0,0.6)] overflow-hidden animate-fade-in">
          {results.length > 0 && (
            <ul className="max-h-[60vh] overflow-y-auto py-1">
              {results.map((e) => (
                <li key={e.id}>
                  <Link
                    to={`/evento/${e.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-primary/10 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted/30 ring-1 ring-white/10">
                      <img
                        src={e.image_url || "/placeholder.svg"}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {e.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">
                        {[e.venue_name, e.category].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {showEmpty && (
            <div className="p-4 text-center">
              <p className="text-sm text-foreground font-medium">
                Nenhum evento encontrado para esta vibe.
              </p>
              <p className="text-xs text-muted-foreground mt-1">Tente outro termo!</p>
              {fallbackEvent && (
                <Link
                  to={`/evento/${fallbackEvent.slug}`}
                  onClick={() => setOpen(false)}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                >
                  ✨ Sugestão: {fallbackEvent.title}
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
