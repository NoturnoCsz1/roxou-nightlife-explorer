import { getCategoryLabel } from "@/lib/categoryConfig";

/** Mantido idêntico ao original (EventoForm.tsx, Fase 3C1). */
export function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Mantido idêntico ao original (EventoForm.tsx, Fase 3C1). */
export function buildRoxouCaption(form: {
  title: string;
  date_time: string;
  venue_name: string;
  category: string;
  description: string;
}): string {
  const dt = form.date_time
    ? new Date(
        form.date_time +
          (form.date_time.includes("T") ? "" : "T00:00") +
          (form.date_time.includes("-03") ? "" : "-03:00"),
      )
    : null;
  const weekday = dt
    ? dt.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" })
    : "";
  const date = dt
    ? dt.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" })
    : "";
  const time = dt
    ? dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
    : "";
  const catLabel = getCategoryLabel(form.category);

  const lines: (string | false)[] = [
    `🔥 ${form.title.toUpperCase()}`,
    "",
    dt && `📅 ${weekday}, ${date}`,
    time && time !== "00:00" && `🕐 ${time}`,
    form.venue_name && `📍 ${form.venue_name}`,
    catLabel && `🎵 ${catLabel}`,
    "",
    form.description
      ? form.description.slice(0, 150).trim() + (form.description.length > 150 ? "…" : "")
      : false,
    form.description ? "" : false,
    "👉 Mais detalhes no Roxou — link na bio!",
    "",
    "#roxou #eventos #presidenteprudente #rolepp #balada",
  ];

  return lines.filter((l) => l !== false).join("\n");
}
