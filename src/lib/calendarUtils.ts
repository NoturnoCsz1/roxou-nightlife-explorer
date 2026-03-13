export function generateICS(event: {
  title: string;
  dateTime: string;
  venue?: string | null;
  address?: string | null;
  description?: string | null;
  url: string;
}): string {
  const dt = new Date(event.dateTime);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(dt.getTime() + 3 * 3600000); // 3h duration default
  const location = [event.venue, event.address].filter(Boolean).join(", ");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ROXOU//Event//PT",
    "BEGIN:VEVENT",
    `DTSTART:${fmt(dt)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description || event.title).replace(/\n/g, "\\n")}`,
    `LOCATION:${location}`,
    `URL:${event.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadICS(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
