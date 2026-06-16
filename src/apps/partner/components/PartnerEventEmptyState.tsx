import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onCreate?: () => void;
  canCreate?: boolean;
}

export function PartnerEventEmptyState({ onCreate, canCreate }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-fuchsia-500/15 text-fuchsia-300">
        <CalendarPlus className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-white">Nenhum evento ainda</h3>
      <p className="mt-1 text-sm text-zinc-400">
        Crie o primeiro evento do seu estabelecimento. Ele será enviado para
        revisão como rascunho.
      </p>
      {canCreate && onCreate && (
        <Button
          className="mt-4 bg-fuchsia-600 hover:bg-fuchsia-500"
          onClick={onCreate}
        >
          Criar evento
        </Button>
      )}
    </div>
  );
}
