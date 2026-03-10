interface DebugInfo {
  firecrawl_returned_content: boolean;
  markdown_length: number;
  metadata_keys: string[];
  og_image_found: boolean;
  caption_found: boolean;
  login_wall_detected: boolean;
  blocked_page_detected: boolean;
  extracted_title: string;
  error_detail?: string;
}

interface Props {
  debug: DebugInfo | null;
}

const isDev = import.meta.env.DEV;

const ImportDebugPanel = ({ debug }: Props) => {
  if (!isDev || !debug) return null;

  const items: { label: string; ok: boolean }[] = [
    {
      label: debug.firecrawl_returned_content ? "Firecrawl retornou conteúdo" : "Sem conteúdo suficiente",
      ok: debug.firecrawl_returned_content,
    },
    {
      label: debug.caption_found ? "Legenda encontrada" : "Legenda não encontrada",
      ok: debug.caption_found,
    },
    {
      label: debug.og_image_found ? "Imagem encontrada" : "Imagem não encontrada",
      ok: debug.og_image_found,
    },
  ];

  if (debug.login_wall_detected) {
    items.push({ label: "Página bloqueada pelo Instagram (login wall)", ok: false });
  }
  if (debug.blocked_page_detected) {
    items.push({ label: "Página bloqueada pelo Instagram", ok: false });
  }

  return (
    <details className="rounded-lg border border-border/30 bg-muted/30 text-[10px]">
      <summary className="cursor-pointer px-3 py-1.5 font-semibold text-muted-foreground select-none">
        🐛 Debug (dev only)
      </summary>
      <div className="px-3 pb-2 space-y-0.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span>{item.ok ? "✅" : "❌"}</span>
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
        <div className="text-muted-foreground/60 pt-1">
          Markdown: {debug.markdown_length} chars · Título: {debug.extracted_title || "—"} · Meta: [{debug.metadata_keys.join(", ")}]
        </div>
        {debug.error_detail && (
          <div className="text-destructive">Erro: {debug.error_detail}</div>
        )}
      </div>
    </details>
  );
};

export default ImportDebugPanel;
