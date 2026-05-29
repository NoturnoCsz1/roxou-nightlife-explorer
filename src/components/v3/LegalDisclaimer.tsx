import { AlertTriangle } from "lucide-react";

export default function LegalDisclaimer() {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/40">
      <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Esta plataforma apenas conecta usuários e motoristas. O Roxou não é responsável pelos serviços de transporte prestados.
      </p>
    </div>
  );
}
