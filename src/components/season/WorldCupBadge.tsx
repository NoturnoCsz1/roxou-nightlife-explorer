import { worldCupTheme as t } from "@/themes/worldCupTheme";

interface Props {
  variant?: "event" | "page";
  className?: string;
}

/**
 * Badge discreta de Copa.
 * - `event`: usada em cards de evento com `is_sports_transmission = true`.
 * - `page`: usada em headers de página (ex: /jogos).
 */
export default function WorldCupBadge({ variant = "event", className = "" }: Props) {
  const label = variant === "page" ? t.copy.pageBadge : t.copy.eventBadge;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-[#009B3A]/45 bg-[#009B3A]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#7CE2A1] ${className}`}
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-[#FFDF00]" />
      {label}
    </span>
  );
}
