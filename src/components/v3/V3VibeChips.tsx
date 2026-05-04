import { useNavigate } from "react-router-dom";

export interface VibeChip {
  key: string;
  label: string;
  /** Termo aplicado na busca (título, categoria, local, descrição). */
  term: string;
  pulse?: boolean;
}

const DEFAULT_CHIPS: VibeChip[] = [
  { key: "hoje", label: "🔥 Hoje", term: "hoje", pulse: true },
  { key: "amanha", label: "🌅 Amanhã", term: "amanha" },
  { key: "fds", label: "🎉 Final de semana", term: "final de semana" },
  { key: "categorias", label: "🎯 Categorias", term: "categorias" },
];

interface Props {
  /** Termo atual da busca (modo controlado). */
  value?: string;
  /** Quando informado, clicar no chip aplica term na busca local. Sem isso, navega para /v3/agenda?q=term. */
  onSelect?: (term: string) => void;
  chips?: VibeChip[];
  className?: string;
}

export default function V3VibeChips({ value, onSelect, chips = DEFAULT_CHIPS, className = "" }: Props) {
  const navigate = useNavigate();

  const handleClick = (chip: VibeChip) => {
    if (chip.key === "categorias") {
      navigate(`/v3/agenda#categorias`);
      return;
    }
    if (onSelect) {
      const isActive = value?.trim().toLowerCase() === chip.term.toLowerCase();
      onSelect(isActive ? "" : chip.term);
    } else {
      navigate(`/v3/agenda?q=${encodeURIComponent(chip.term)}`);
    }
  };

  return (
    <div className={`relative py-4 ${className}`}>
      <div className="flex flex-nowrap gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide scroll-smooth snap-x snap-mandatory [scroll-padding-inline:1rem]">
        {chips.map((chip) => {
          const isActive = !!value && value.trim().toLowerCase() === chip.term.toLowerCase();
          const base =
            "snap-start flex-none px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap";
          const stateClass = isActive
            ? "bg-primary/25 border border-primary text-primary-foreground shadow-[0_0_18px_hsl(var(--v3-neon)/0.45)]"
            : chip.pulse
            ? "bg-primary/20 border border-primary/50 text-primary-foreground animate-pulse"
            : "bg-white/5 border border-white/10 text-foreground/80 hover:border-primary/50 hover:bg-primary/10";
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => handleClick(chip)}
              className={`${base} ${stateClass}`}
            >
              {chip.label}
            </button>
          );
        })}
        {/* Spacer para garantir que o último chip não fique colado na borda */}
        <div className="flex-none w-4" aria-hidden />
      </div>
      {/* Fade gradiente à direita para indicar mais conteúdo */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}
