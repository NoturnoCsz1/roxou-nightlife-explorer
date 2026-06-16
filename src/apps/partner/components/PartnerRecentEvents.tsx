/**
 * PartnerRecentEvents — Fase 9D
 * Lista compacta dos últimos eventos do partner (read-only).
 */
import { Card, CardContent } from "@/components/ui/card";
import type { PartnerEventRow } from "../services/partnerDashboard";

const STATUS_LABEL: Record<string, string> = {
  published: "Publicado",
  draft: "Rascunho",
  archived: "Arquivado",
  pending: "Pendente",
};

export function PartnerRecentEvents({ events }: { events: PartnerEventRow[] }) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-medium mb-3">Eventos recentes</h3>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum evento cadastrado.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 rounded-md border border-border p-2"
              >
                <div className="h-10 w-10 shrink-0 rounded bg-muted overflow-hidden">
                  {e.image_url ? (
                    <img
                      src={e.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{e.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(e.date_time).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" · "}
                    {STATUS_LABEL[e.status ?? ""] ?? e.status ?? "—"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default PartnerRecentEvents;
