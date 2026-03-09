import { getPeriodLabel, DashboardPeriod } from "./dashboardPeriod";

interface ExportData {
  period: DashboardPeriod;
  metrics: Record<string, number>;
  topPages: { label: string; views: number }[];
  topEvents: { title: string; views: number; date: string }[];
  topPartners: { name: string; pageViews: number; eventViews: number; eventCount: number; total: number }[];
}

function escapeCSV(val: string | number): string {
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCSVContent(data: ExportData): string {
  const periodLabel = getPeriodLabel(data.period);
  const lines: string[] = [];

  lines.push(`Relatório ROXOU - Período: ${periodLabel}`);
  lines.push(`Gerado em: ${new Date().toLocaleString("pt-BR")}`);
  lines.push("");

  // Metrics
  lines.push("=== Métricas ===");
  lines.push("Métrica,Valor");
  Object.entries(data.metrics).forEach(([key, val]) => {
    lines.push(`${escapeCSV(key)},${val}`);
  });
  lines.push("");

  // Top pages
  lines.push("=== Páginas Mais Visitadas ===");
  lines.push("Página,Views");
  data.topPages.forEach((p) => {
    lines.push(`${escapeCSV(p.label)},${p.views}`);
  });
  lines.push("");

  // Top events
  lines.push("=== Eventos Mais Vistos ===");
  lines.push("Evento,Data,Views");
  data.topEvents.forEach((e) => {
    lines.push(`${escapeCSV(e.title)},${escapeCSV(e.date)},${e.views}`);
  });
  lines.push("");

  // Top partners
  lines.push("=== Parceiros Mais Populares ===");
  lines.push("Parceiro,Views Página,Views Eventos,Nº Eventos,Total");
  data.topPartners.forEach((p) => {
    lines.push(`${escapeCSV(p.name)},${p.pageViews},${p.eventViews},${p.eventCount},${p.total}`);
  });

  return lines.join("\n");
}

function getFileName(period: DashboardPeriod, ext: string): string {
  const date = new Date().toISOString().split("T")[0];
  const periodSlug = getPeriodLabel(period).replace(/\s+/g, "-").toLowerCase();
  return `roxou-dashboard-${periodSlug}-${date}.${ext}`;
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCSV(data: ExportData) {
  const content = buildCSVContent(data);
  downloadBlob(content, getFileName(data.period, "csv"), "text/csv");
}

export function exportExcel(data: ExportData) {
  // Generate a simple HTML table that Excel can open natively
  const periodLabel = getPeriodLabel(data.period);
  const rows: string[] = [];

  rows.push("<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel'>");
  rows.push("<head><meta charset='utf-8'></head><body>");

  // Metrics table
  rows.push(`<h3>Relatório ROXOU - ${periodLabel} - ${new Date().toLocaleDateString("pt-BR")}</h3>`);
  rows.push("<table border='1'><tr><th>Métrica</th><th>Valor</th></tr>");
  Object.entries(data.metrics).forEach(([key, val]) => {
    rows.push(`<tr><td>${key}</td><td>${val}</td></tr>`);
  });
  rows.push("</table><br/>");

  // Top pages
  rows.push("<table border='1'><tr><th colspan='2'>Páginas Mais Visitadas</th></tr><tr><th>Página</th><th>Views</th></tr>");
  data.topPages.forEach((p) => {
    rows.push(`<tr><td>${p.label}</td><td>${p.views}</td></tr>`);
  });
  rows.push("</table><br/>");

  // Top events
  rows.push("<table border='1'><tr><th colspan='3'>Eventos Mais Vistos</th></tr><tr><th>Evento</th><th>Data</th><th>Views</th></tr>");
  data.topEvents.forEach((e) => {
    rows.push(`<tr><td>${e.title}</td><td>${e.date}</td><td>${e.views}</td></tr>`);
  });
  rows.push("</table><br/>");

  // Top partners
  rows.push("<table border='1'><tr><th colspan='5'>Parceiros Mais Populares</th></tr><tr><th>Parceiro</th><th>Views Página</th><th>Views Eventos</th><th>Nº Eventos</th><th>Total</th></tr>");
  data.topPartners.forEach((p) => {
    rows.push(`<tr><td>${p.name}</td><td>${p.pageViews}</td><td>${p.eventViews}</td><td>${p.eventCount}</td><td>${p.total}</td></tr>`);
  });
  rows.push("</table>");

  rows.push("</body></html>");

  downloadBlob(rows.join("\n"), getFileName(data.period, "xls"), "application/vnd.ms-excel");
}
