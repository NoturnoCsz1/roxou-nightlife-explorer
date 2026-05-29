import { useState, useMemo } from "react";
import { Search, CalendarDays, X } from "lucide-react";

export type DateFilter = "hoje" | "amanha" | "semana" | "fds" | "proximos" | "todos";

const DATE_PILLS: { key: DateFilter; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "amanha", label: "Amanhã" },
  { key: "semana", label: "Esta semana" },
  { key: "fds", label: "Fim de semana" },
  { key: "proximos", label: "Próximos" },
  { key: "todos", label: "Todos" },
];

export function getDateRange(filter: DateFilter): { start: Date; end: Date | null } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter) {
    case "hoje":
      return { start: today, end: new Date(today.getTime() + 86400000) };
    case "amanha": {
      const tomorrow = new Date(today.getTime() + 86400000);
      return { start: tomorrow, end: new Date(tomorrow.getTime() + 86400000) };
    }
    case "semana": {
      const endOfWeek = new Date(today.getTime() + (7 - today.getDay()) * 86400000 + 86400000);
      return { start: today, end: endOfWeek };
    }
    case "fds": {
      const dow = today.getDay();
      const daysToFri = dow <= 5 ? 5 - dow : 6;
      const fri = new Date(today.getTime() + daysToFri * 86400000);
      const mon = new Date(fri.getTime() + 3 * 86400000);
      return { start: fri, end: mon };
    }
    case "proximos":
      return { start: today, end: new Date(today.getTime() + 30 * 86400000) };
    case "todos":
      return { start: today, end: null };
    default:
      return { start: today, end: new Date(today.getTime() + 86400000) };
  }
}

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  dateFilter: DateFilter;
  onDateFilterChange: (f: DateFilter) => void;
}

export default function EventSearchFilter({ searchQuery, onSearchChange, dateFilter, onDateFilterChange }: Props) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-3 space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nome, local ou data..."
          className="w-full rounded-lg border border-border/30 bg-background pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Date pills */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {DATE_PILLS.map((p) => (
          <button
            key={p.key}
            onClick={() => onDateFilterChange(p.key)}
            className={`flex items-center gap-1 whitespace-nowrap text-[10px] px-2.5 py-1.5 rounded-full font-semibold transition ${
              dateFilter === p.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            {p.key === dateFilter && <CalendarDays className="h-3 w-3" />}
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
