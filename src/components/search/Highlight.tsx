import { Link } from "react-router-dom";
import { highlightSegments } from "./searchUtils";

interface Props {
  text: string;
  variants: string[];
  className?: string;
}

export function Highlight({ text, variants, className }: Props) {
  const segs = highlightSegments(text || "", variants);
  return (
    <span className={className}>
      {segs.map((s, i) =>
        s.hit ? (
          <mark
            key={i}
            className="bg-primary/25 text-primary rounded-sm px-0.5 font-bold"
          >
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </span>
  );
}

export const QUICK_LINKS: Array<{ label: string; href: string }> = [
  { label: "🔥 Hoje em Presidente Prudente", href: "/eventos-hoje-em-presidente-prudente" },
  { label: "🔥 Pagode em Presidente Prudente", href: "/pagode-em-presidente-prudente" },
  { label: "🔥 Funk em Presidente Prudente", href: "/funk-em-presidente-prudente" },
  { label: "🔥 Sertanejo em Presidente Prudente", href: "/sertanejo-em-presidente-prudente" },
  { label: "🔥 Música ao Vivo em Presidente Prudente", href: "/musica-ao-vivo-em-presidente-prudente" },
  { label: "🔥 Baladas em Presidente Prudente", href: "/baladas-em-presidente-prudente" },
  { label: "🔥 O que fazer hoje", href: "/o-que-fazer-em-presidente-prudente-hoje" },
];

export function QuickLinkCloud({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_LINKS.map((l) => (
        <Link
          key={l.href}
          to={l.href}
          onClick={onNavigate}
          className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-foreground hover:bg-primary/15 hover:border-primary/40 hover:text-primary transition-colors"
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
