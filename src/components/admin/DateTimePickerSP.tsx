import { useMemo, useState } from "react";
import { CalendarIcon, Clock } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Date+time picker anchored to America/Sao_Paulo.
 *
 * - Value (controlled) is a "datetime-local" string: "YYYY-MM-DDTHH:mm".
 * - The actual ISO conversion (with -03:00) is handled by spLocalToISO at
 *   save time, exactly like the previous <input type="datetime-local">.
 *   So this component is a drop-in replacement that keeps the timezone trava.
 */
export interface DateTimePickerSPProps {
  value: string; // "YYYY-MM-DDTHH:mm" (datetime-local format)
  onChange: (next: string) => void;
  className?: string;
  placeholder?: string;
}

const TIME_SHORTCUTS = ["20:00", "22:00", "23:00", "00:00"];

function parseLocal(value: string): { date: Date | undefined; time: string } {
  if (!value) return { date: undefined, time: "" };
  const safe = value.length === 16 ? value : value.slice(0, 16);
  const datePart = safe.slice(0, 10);
  const timePart = safe.slice(11, 16) || "";
  // Use local-naive parsing so the date stays exactly what the user typed,
  // independent of the browser's timezone.
  const date = parse(datePart, "yyyy-MM-dd", new Date());
  return { date: isNaN(date.getTime()) ? undefined : date, time: timePart };
}

function formatLocal(date: Date, time: string): string {
  const dateStr = format(date, "yyyy-MM-dd");
  const safeTime = /^\d{2}:\d{2}$/.test(time) ? time : "20:00";
  return `${dateStr}T${safeTime}`;
}

const triggerClass =
  "flex h-10 w-full items-center justify-between rounded-md border border-border/50 bg-background/60 px-3 text-sm text-foreground transition hover:border-primary/40 hover:bg-background focus:border-primary/70 focus:outline-none focus:ring-1 focus:ring-primary/30";

export default function DateTimePickerSP({
  value,
  onChange,
  className,
  placeholder = "Selecionar data",
}: DateTimePickerSPProps) {
  const { date, time } = useMemo(() => parseLocal(value), [value]);
  const [timeDraft, setTimeDraft] = useState<string>(time);

  // Keep local draft in sync when value changes externally.
  if (time !== timeDraft && time && !timeDraft) {
    setTimeDraft(time);
  }

  const setDate = (next: Date | undefined) => {
    if (!next) return;
    const nextTime = timeDraft || time || "20:00";
    onChange(formatLocal(next, nextTime));
    setTimeDraft(nextTime);
  };

  const setTime = (raw: string) => {
    // Apply mask: keep digits, force HH:mm
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    let masked = digits;
    if (digits.length >= 3) masked = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    setTimeDraft(masked);
    if (date && /^\d{2}:\d{2}$/.test(masked)) {
      const [hh, mm] = masked.split(":").map(Number);
      if (hh < 24 && mm < 60) onChange(formatLocal(date, masked));
    }
  };

  const applyShortcut = (t: string) => {
    setTimeDraft(t);
    if (date) onChange(formatLocal(date, t));
  };

  const longDate = date
    ? format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,140px]">
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={triggerClass}>
              <span className={cn(!date && "text-muted-foreground")}>
                {date ? format(date, "dd 'de' MMM 'de' yyyy", { locale: ptBR }) : placeholder}
              </span>
              <CalendarIcon className="h-4 w-4 text-primary/70" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-auto border-border/60 bg-card/95 p-0 shadow-2xl shadow-primary/20 backdrop-blur-xl"
          >
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              locale={ptBR}
              weekStartsOn={0}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <div className="relative">
          <Clock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary/70" />
          <input
            type="text"
            inputMode="numeric"
            placeholder="00:00"
            maxLength={5}
            value={timeDraft}
            onChange={(e) => setTime(e.target.value)}
            className={cn(triggerClass, "pl-8 pr-2 font-mono tracking-wider")}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {TIME_SHORTCUTS.map((t) => {
          const active = (timeDraft || time) === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => applyShortcut(t)}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[11px] font-semibold transition",
                active
                  ? "border-primary/70 bg-primary/20 text-primary shadow-[0_0_12px_-2px_hsl(var(--primary)/0.6)]"
                  : "border-border/40 bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-primary",
              )}
            >
              {t}
            </button>
          );
        })}
        {longDate && (
          <span className="ml-auto rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium capitalize text-primary">
            {longDate}
          </span>
        )}
      </div>
    </div>
  );
}
