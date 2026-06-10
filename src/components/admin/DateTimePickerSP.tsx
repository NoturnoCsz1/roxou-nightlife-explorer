import { useMemo, useState } from "react";
import { CalendarIcon, Clock, HelpCircle } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Date+time picker anchored to America/Sao_Paulo.
 *
 * - `value` is a "datetime-local" string: "YYYY-MM-DDTHH:mm".
 *   When `timeIsUnknown` is true, the time portion is stored as "00:00"
 *   internally but rendered as empty/"Horário a confirmar".
 * - The ISO conversion (with -03:00) is handled by buildEventPayload at
 *   save time, so this component stays a drop-in for the existing pipeline.
 * - We NEVER silently default to 20:00 anymore. If the admin doesn't pick
 *   a time, the field stays empty; choosing a date without time triggers
 *   `onTimeIsUnknownChange?.(true)` so the rest of the app knows.
 */
export interface DateTimePickerSPProps {
  value: string; // "YYYY-MM-DDTHH:mm" (datetime-local format)
  onChange: (next: string) => void;
  className?: string;
  placeholder?: string;
  timeIsUnknown?: boolean;
  onTimeIsUnknownChange?: (next: boolean) => void;
}

const TIME_SHORTCUTS = ["20:00", "22:00", "23:00", "00:00"];

function parseLocal(value: string): { date: Date | undefined; time: string } {
  if (!value) return { date: undefined, time: "" };
  const safe = value.length === 16 ? value : value.slice(0, 16);
  const datePart = safe.slice(0, 10);
  const timePart = safe.slice(11, 16) || "";
  const date = parse(datePart, "yyyy-MM-dd", new Date());
  return { date: isNaN(date.getTime()) ? undefined : date, time: timePart };
}

function formatLocal(date: Date, time: string): string {
  const dateStr = format(date, "yyyy-MM-dd");
  // ⚠️ NÃO usar fallback "20:00" silencioso. Sem hora → "00:00" como sentinela,
  // e o caller deve setar timeIsUnknown=true para que o app saiba que é desconhecido.
  const safeTime = /^\d{2}:\d{2}$/.test(time) ? time : "00:00";
  return `${dateStr}T${safeTime}`;
}

const triggerClass =
  "flex h-10 w-full items-center justify-between rounded-md border border-border/50 bg-background/60 px-3 text-sm text-foreground transition hover:border-primary/40 hover:bg-background focus:border-primary/70 focus:outline-none focus:ring-1 focus:ring-primary/30";

export default function DateTimePickerSP({
  value,
  onChange,
  className,
  placeholder = "Selecionar data",
  timeIsUnknown = false,
  onTimeIsUnknownChange,
}: DateTimePickerSPProps) {
  const { date, time } = useMemo(() => parseLocal(value), [value]);
  const [timeDraft, setTimeDraft] = useState<string>(time);

  if (time !== timeDraft && time && !timeDraft) {
    setTimeDraft(time);
  }

  const setDate = (next: Date | undefined) => {
    if (!next) return;
    // Sem hora válida e admin ainda não escolheu → marca como desconhecido.
    const candidate = timeDraft || time;
    if (!/^\d{2}:\d{2}$/.test(candidate)) {
      onChange(formatLocal(next, "00:00"));
      setTimeDraft("");
      onTimeIsUnknownChange?.(true);
      return;
    }
    onChange(formatLocal(next, candidate));
    setTimeDraft(candidate);
  };

  const setTime = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    let masked = digits;
    if (digits.length >= 3) masked = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    setTimeDraft(masked);
    if (date && /^\d{2}:\d{2}$/.test(masked)) {
      const [hh, mm] = masked.split(":").map(Number);
      if (hh < 24 && mm < 60) {
        onChange(formatLocal(date, masked));
        // admin digitou horário → não é mais desconhecido
        if (timeIsUnknown) onTimeIsUnknownChange?.(false);
      }
    } else if (!masked && timeIsUnknown === false) {
      // limpou o campo → volta a ser "a confirmar"
      onTimeIsUnknownChange?.(true);
    }
  };

  const applyShortcut = (t: string) => {
    setTimeDraft(t);
    if (date) {
      onChange(formatLocal(date, t));
      if (timeIsUnknown) onTimeIsUnknownChange?.(false);
    }
  };

  const toggleUnknown = () => {
    const next = !timeIsUnknown;
    onTimeIsUnknownChange?.(next);
    if (next) {
      setTimeDraft("");
      if (date) onChange(formatLocal(date, "00:00"));
    }
  };

  const longDate = date
    ? format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "";

  const displayTime = timeIsUnknown ? "" : timeDraft;

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
            placeholder={timeIsUnknown ? "a confirmar" : "00:00"}
            maxLength={5}
            value={displayTime}
            onChange={(e) => setTime(e.target.value)}
            className={cn(
              triggerClass,
              "pl-8 pr-2 font-mono tracking-wider",
              timeIsUnknown && "italic text-muted-foreground placeholder:text-amber-300/70",
            )}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {TIME_SHORTCUTS.map((t) => {
          const active = !timeIsUnknown && (timeDraft || time) === t;
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
        <button
          type="button"
          onClick={toggleUnknown}
          className={cn(
            "ml-1 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition",
            timeIsUnknown
              ? "border-amber-400/70 bg-amber-400/20 text-amber-200 shadow-[0_0_12px_-2px_hsl(45_90%_55%/0.6)]"
              : "border-border/40 bg-secondary/30 text-muted-foreground hover:border-amber-400/40 hover:text-amber-300",
          )}
          title="Marca este evento como 'Horário a confirmar'. Nada de '20h' inventado."
        >
          <HelpCircle className="h-3 w-3" />
          {timeIsUnknown ? "Horário a confirmar" : "Sem horário?"}
        </button>
        {longDate && (
          <span className="ml-auto rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium capitalize text-primary">
            {longDate}
          </span>
        )}
      </div>
      {timeIsUnknown && (
        <p className="text-[10px] text-amber-300/80">
          ⚠ Este evento será publicado como <strong>horário a confirmar</strong> — descrições e cards
          NÃO vão inventar "a partir das 20h".
        </p>
      )}
    </div>
  );
}
